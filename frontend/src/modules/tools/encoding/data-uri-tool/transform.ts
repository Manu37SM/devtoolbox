import type { TransformResult } from "@/lib/tool-transform";
import type { DataUriOptions } from "./schema";

const KEEP = /[A-Za-z0-9\-_.~:/;,=@!*()'$]/;

function percentEncode(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    const ch = String.fromCharCode(b);
    out += b < 128 && KEEP.test(ch) ? ch : `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
  }
  return out;
}

function toBase64(bytes: Uint8Array, urlSafe: boolean): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  const b64 = btoa(s);
  return urlSafe ? b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : b64;
}

const isTextMime = (m: string) => /^text\//i.test(m) || /(json|xml|javascript|svg|yaml|x-www-form-urlencoded)/i.test(m);

export interface ParsedDataUri {
  mediaType: string;
  params: Record<string, string>;
  base64: boolean;
  bytes: Uint8Array;
}

export function parseDataUri(uri: string): ParsedDataUri {
  const m = /^\s*data:([^,]*),([\s\S]*)$/i.exec(uri.trim());
  if (!m) throw new Error('Not a data URI. It must look like data:[<type>][;base64],<data>.');
  const head = m[1]!.split(";");
  let mediaType = head.shift()!.trim().toLowerCase();
  let base64 = false;
  const params: Record<string, string> = {};
  for (const p of head) {
    if (p.trim().toLowerCase() === "base64") base64 = true;
    else {
      const eq = p.indexOf("=");
      if (eq > 0) params[p.slice(0, eq).trim().toLowerCase()] = decodeURIComponent(p.slice(eq + 1).trim());
    }
  }
  if (!mediaType) mediaType = "text/plain"; // RFC 2397 default
  if (!mediaType.includes("/")) throw new Error(`"${mediaType}" is not a valid media type.`);
  const payload = m[2]!;
  let bytes: Uint8Array;
  if (base64) {
    const clean = decodeURIComponent(payload.replace(/\s+/g, "")).replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");
    try {
      const bin = atob(clean.padEnd(Math.ceil(clean.length / 4) * 4, "="));
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } catch {
      throw new Error("The base64 payload is invalid.");
    }
  } else {
    const out: number[] = [];
    for (let i = 0; i < payload.length; i++) {
      const c = payload[i]!;
      if (c === "%" && /^[0-9a-fA-F]{2}$/.test(payload.slice(i + 1, i + 3))) {
        out.push(parseInt(payload.slice(i + 1, i + 3), 16));
        i += 2;
      } else for (const b of new TextEncoder().encode(String.fromCodePoint(payload.codePointAt(i)!))) out.push(b);
    }
    bytes = Uint8Array.from(out);
  }
  return { mediaType, params, base64, bytes };
}

export function buildDataUri(text: string, o: DataUriOptions): string {
  const mime = (o.mime.trim() || "text/plain").toLowerCase();
  const input = o.minify ? text.replace(/\s*[\r\n]+\s*/g, " ").replace(/>\s+</g, "><").trim() : text;
  const bytes = new TextEncoder().encode(input);
  const pct = percentEncode(bytes);
  const b64 = toBase64(bytes, o.urlSafe);
  const useB64 = o.encoding === "base64" || (o.encoding === "auto" && b64.length + 7 < pct.length);
  const charset = o.includeCharset && isTextMime(mime) && o.charset.trim() ? `;charset=${o.charset.trim()}` : "";
  return `data:${mime}${charset}${useB64 ? ";base64" : ""},${useB64 ? b64 : pct}`;
}

function wrapUri(uri: string, how: DataUriOptions["wrap"]): string {
  switch (how) {
    case "css-url": return `url("${uri.replace(/"/g, "%22")}")`;
    case "html-img": return `<img src="${uri.replace(/"/g, "&quot;")}" alt="">`;
    case "html-link": return `<a href="${uri.replace(/"/g, "&quot;")}" download>Download</a>`;
    case "markdown-img": return `![](${uri.replace(/\)/g, "%29").replace(/ /g, "%20")})`;
    case "js-string": return JSON.stringify(uri);
    default: return uri;
  }
}

export function dataUriTool(input: string, options: Partial<DataUriOptions>): TransformResult {
  const o: DataUriOptions = {
    mode: options.mode ?? "build",
    mime: options.mime ?? "text/plain",
    encoding: options.encoding ?? "auto",
    charset: options.charset ?? "utf-8",
    includeCharset: options.includeCharset ?? true,
    minify: options.minify ?? false,
    wrap: options.wrap ?? "none",
    urlSafe: options.urlSafe ?? false,
  };
  if (!input.trim()) return { output: "", error: null };
  if (o.mode === "build") return { output: wrapUri(buildDataUri(input, o), o.wrap), error: null };
  try {
    const p = parseDataUri(input);
    const text = isTextMime(p.mediaType) ? new TextDecoder(p.params.charset || "utf-8").decode(p.bytes) : null;
    const lines = [
      `Media type: ${p.mediaType}`,
      `Parameters: ${Object.keys(p.params).length ? Object.entries(p.params).map(([k, v]) => `${k}=${v}`).join("; ") : "(none)"}`,
      `Encoding:   ${p.base64 ? "base64" : "percent-encoded"}`,
      `Size:       ${p.bytes.length} byte${p.bytes.length === 1 ? "" : "s"}`,
      "",
    ];
    if (text !== null) lines.push("Decoded content:", text);
    else {
      const hex = Array.from(p.bytes.slice(0, 64), (b) => b.toString(16).padStart(2, "0")).join(" ");
      lines.push(`Binary content (first ${Math.min(64, p.bytes.length)} bytes):`, hex + (p.bytes.length > 64 ? " …" : ""));
    }
    return { output: lines.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
