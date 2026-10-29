import type { TransformResult } from "@/lib/tool-transform";
import type { AwsSigv4CalculatorOptions } from "./schema";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(b instanceof Uint8Array ? b : new Uint8Array(b), (x) => x.toString(16).padStart(2, "0")).join("");
export async function sha256Hex(data: string | Uint8Array): Promise<string> { return hex(await crypto.subtle.digest("SHA-256", (typeof data === "string" ? enc.encode(data) : data) as BufferSource)); }
async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** RFC 3986 encoding as SigV4 requires (unreserved: A-Z a-z 0-9 - _ . ~). */
export const uriEncode = (s: string, keepSlash = false) =>
  Array.from(enc.encode(s), (b) => { const c = String.fromCharCode(b); return /[A-Za-z0-9\-_.~]/.test(c) || (keepSlash && c === "/") ? c : `%${b.toString(16).toUpperCase().padStart(2, "0")}`; }).join("");

const safeDecode = (s: string) => { try { return decodeURIComponent(s.replace(/\+/g, "%20")); } catch { return s; } };

export function canonicalUri(pathname: string, service: string): string {
  if (!pathname) return "/";
  const segments = pathname.split("/");
  return service === "s3" ? segments.map((s) => uriEncode(safeDecode(s))).join("/") : segments.map((s) => uriEncode(uriEncode(safeDecode(s)))).join("/");
}

export function canonicalQuery(params: [string, string][]): string {
  return params.map(([k, v]) => [uriEncode(k), uriEncode(v)] as const).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&");
}

export interface Fields { method: string; url: string; region: string; service: string; accessKey: string; secretKey: string; sessionToken?: string; date: string; expires: number; headers: [string, string][]; body: string }

export function parseFields(input: string, now = new Date()): Fields {
  const [head, ...bodyParts] = input.split(/\r?\n\r?\n/);
  const get = new Map<string, string>();
  const headers: [string, string][] = [];
  for (const line of head!.split(/\r?\n/)) {
    const m = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    if (key === "header") { const h = /^([^:]+):\s*(.*)$/.exec(m[2]!); if (h) headers.push([h[1]!.trim(), h[2]!]); }
    else get.set(key, m[2]!.trim());
  }
  const need = (k: string) => { const v = get.get(k); if (!v) throw new Error(`Missing "${k}:" line.`); return v; };
  const date = get.get("date") ?? now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  if (!/^\d{8}T\d{6}Z$/.test(date)) throw new Error(`date must look like 20150830T123600Z, got "${date}".`);
  return {
    method: (get.get("method") ?? "GET").toUpperCase(), url: need("url"), region: need("region"), service: need("service"),
    accessKey: need("access-key"), secretKey: need("secret-key"), sessionToken: get.get("session-token") || undefined,
    date, expires: Number(get.get("expires") ?? 3600), headers, body: bodyParts.join("\n\n"),
  };
}

export async function signingKey(secret: string, day: string, region: string, service: string): Promise<Uint8Array> {
  let k = await hmac(enc.encode(`AWS4${secret}`), day);
  k = await hmac(k, region);
  k = await hmac(k, service);
  return hmac(k, "aws4_request");
}

export async function sign(f: Fields, mode: "header" | "presigned", unsignedPayload: boolean) {
  const url = new URL(f.url);
  const day = f.date.slice(0, 8);
  const scope = `${day}/${f.region}/${f.service}/aws4_request`;
  const params: [string, string][] = [];
  url.searchParams.forEach((v, k) => params.push([k, v]));
  const headers = new Map<string, string>();
  headers.set("host", url.host);
  for (const [k, v] of f.headers) headers.set(k.toLowerCase(), v.trim().replace(/\s+/g, " "));
  const payloadHash = unsignedPayload || mode === "presigned" ? "UNSIGNED-PAYLOAD" : await sha256Hex(f.body);
  if (mode === "header") {
    headers.set("x-amz-date", f.date);
    if (f.sessionToken) headers.set("x-amz-security-token", f.sessionToken);
    if (f.service === "s3") headers.set("x-amz-content-sha256", payloadHash);
  }
  const names = [...headers.keys()].sort();
  const signedHeaders = names.join(";");
  if (mode === "presigned") {
    params.push(["X-Amz-Algorithm", "AWS4-HMAC-SHA256"], ["X-Amz-Credential", `${f.accessKey}/${scope}`], ["X-Amz-Date", f.date], ["X-Amz-Expires", String(f.expires)], ["X-Amz-SignedHeaders", signedHeaders]);
    if (f.sessionToken) params.push(["X-Amz-Security-Token", f.sessionToken]);
  }
  const canonicalHeaders = names.map((n) => `${n}:${headers.get(n)}\n`).join("");
  const canonicalRequest = [f.method, canonicalUri(url.pathname, f.service), canonicalQuery(params), canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", f.date, scope, await sha256Hex(canonicalRequest)].join("\n");
  const key = await signingKey(f.secretKey, day, f.region, f.service);
  const signature = hex(await hmac(key, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${f.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const presignedUrl = mode === "presigned" ? `${url.origin}${url.pathname}?${canonicalQuery(params)}&X-Amz-Signature=${signature}` : undefined;
  return { canonicalRequest, stringToSign, signingKeyHex: hex(key), signature, authorization, headers, payloadHash, presignedUrl };
}

export async function runAwsSigv4Calculator(input: string, options: AwsSigv4CalculatorOptions): Promise<TransformResult> {
  if (!input.trim()) return { output: "", error: null };
  let f: Fields;
  try { f = parseFields(input); new URL(f.url); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const r = await sign(f, options.mode, options.unsignedPayload);
  const out: string[] = [];
  if (options.mode === "presigned") out.push(`Presigned URL (valid ${f.expires}s from ${f.date}):\n${r.presignedUrl}`);
  else {
    out.push(`Authorization: ${r.authorization}`, `X-Amz-Date: ${f.date}`);
    if (f.sessionToken) out.push(`X-Amz-Security-Token: ${f.sessionToken}`);
    if (f.service === "s3") out.push(`X-Amz-Content-SHA256: ${r.payloadHash}`);
    const hdrs = [...r.headers].filter(([k]) => k !== "host").map(([k, v]) => ` \\\n  -H '${k}: ${v.replace(/'/g, `'\\''`)}'`).join("");
    out.push("", `curl -X ${f.method} '${f.url}'${hdrs} \\\n  -H 'Authorization: ${r.authorization}'${f.body ? ` \\\n  --data-raw '${f.body.replace(/'/g, `'\\''`)}'` : ""}`);
  }
  if (options.showSteps) out.push("", "Canonical request:", r.canonicalRequest, "", "String to sign:", r.stringToSign, "", `Signing key: ${r.signingKeyHex}`, `Signature:   ${r.signature}`);
  out.push("", "The secret key never leaves your browser, but avoid pasting long-lived production keys; prefer temporary STS credentials.");
  return { output: out.join("\n"), error: null };
}
