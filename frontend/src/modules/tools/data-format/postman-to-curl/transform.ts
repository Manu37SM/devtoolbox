import type { TransformResult } from "@/lib/tool-transform";
import type { PostmanToCurlOptions } from "./schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.filter(isObj) : []);
const str = (v: unknown) => (v === undefined || v === null ? "" : String(v));

/** v2.1 auth uses [{key, value}] lists, v2.0 uses plain objects. */
function authParams(auth: Obj, type: string): Record<string, string> {
  const raw = auth[type];
  if (Array.isArray(raw)) return Object.fromEntries(arr(raw).map((p) => [str(p.key), str(p.value)]));
  if (isObj(raw)) return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, str(v)]));
  return {};
}

export interface Req { path: string[]; method: string; url: string; headers: [string, string][]; body?: { kind: "raw" | "urlencoded" | "form"; raw?: string; pairs?: [string, string, boolean][] } }

export function collectRequests(items: unknown, parentAuth: Obj | null, path: string[] = []): Req[] {
  const out: Req[] = [];
  for (const it of arr(items)) {
    const name = str(it.name) || "Request";
    if (Array.isArray(it.item)) {
      const folderAuth = isObj(it.auth) && it.auth.type !== "inherit" ? it.auth : parentAuth;
      out.push(...collectRequests(it.item, folderAuth, [...path, name]));
      continue;
    }
    const r = typeof it.request === "string" ? { url: it.request, method: "GET" } as Obj : isObj(it.request) ? it.request : null;
    if (!r) continue;
    const method = str(r.method || "GET").toUpperCase();
    const u = r.url;
    let url = typeof u === "string" ? u : isObj(u) ? str(u.raw) : "";
    if (isObj(u) && !u.raw) {
      const host = Array.isArray(u.host) ? u.host.join(".") : str(u.host);
      const p = Array.isArray(u.path) ? u.path.join("/") : str(u.path);
      const q = arr(u.query).filter((x) => !x.disabled).map((x) => `${str(x.key)}=${str(x.value)}`).join("&");
      url = `${u.protocol ? `${str(u.protocol)}://` : ""}${host}${u.port ? `:${str(u.port)}` : ""}${p ? `/${p}` : ""}${q ? `?${q}` : ""}`;
    }
    const headers: [string, string][] = arr(r.header).filter((h) => !h.disabled).map((h) => [str(h.key), str(h.value)]);
    const auth = isObj(r.auth) && r.auth.type !== "inherit" ? r.auth : parentAuth;
    if (auth && auth.type !== "noauth" && !headers.some(([k]) => k.toLowerCase() === "authorization")) {
      const t = str(auth.type);
      const p = authParams(auth, t);
      if (t === "bearer") headers.push(["Authorization", `Bearer ${p.token ?? ""}`]);
      else if (t === "basic") headers.push(["__basic__", `${p.username ?? ""}:${p.password ?? ""}`]);
      else if (t === "apikey") {
        if ((p.in ?? "header") === "query") url += `${url.includes("?") ? "&" : "?"}${encodeURIComponent(p.key ?? "api_key")}=${p.value ?? ""}`;
        else headers.push([p.key ?? "X-API-Key", p.value ?? ""]);
      } else if (t) headers.push(["__unsupported__", t]);
    }
    let body: Req["body"];
    const b = isObj(r.body) && !r.body.disabled ? r.body : null;
    if (b) {
      const mode = str(b.mode);
      if (mode === "raw" && str(b.raw)) {
        body = { kind: "raw", raw: str(b.raw) };
        const lang = isObj(b.options) && isObj(b.options.raw) ? str(b.options.raw.language) : "";
        const ct = { json: "application/json", xml: "application/xml", text: "text/plain", html: "text/html", javascript: "application/javascript" }[lang];
        if (ct && !headers.some(([k]) => k.toLowerCase() === "content-type")) headers.push(["Content-Type", ct]);
      } else if (mode === "urlencoded") body = { kind: "urlencoded", pairs: arr(b.urlencoded).filter((x) => !x.disabled).map((x) => [str(x.key), str(x.value), false]) };
      else if (mode === "formdata") body = { kind: "form", pairs: arr(b.formdata).filter((x) => !x.disabled).map((x) => (x.type === "file" ? [str(x.key), str(Array.isArray(x.src) ? x.src[0] : x.src) || "file.bin", true] : [str(x.key), str(x.value), false])) };
      else if (mode === "graphql" && isObj(b.graphql)) {
        let variables: unknown = undefined;
        try { variables = b.graphql.variables ? JSON.parse(str(b.graphql.variables)) : undefined; } catch { variables = str(b.graphql.variables); }
        body = { kind: "raw", raw: JSON.stringify(variables === undefined ? { query: str(b.graphql.query) } : { query: str(b.graphql.query), variables }) };
        if (!headers.some(([k]) => k.toLowerCase() === "content-type")) headers.push(["Content-Type", "application/json"]);
      }
    }
    out.push({ path: [...path, name], method, url, headers, body });
  }
  return out;
}

const SECRET_HEADER = /^(authorization|x-api-key|api-key|apikey|x-auth-token|cookie|__basic__)$/i;

export function runPostmanToCurl(input: string, options: PostmanToCurlOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let doc: unknown;
  try { doc = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  if (!isObj(doc)) return { output: "", error: { message: "Expected a Postman collection object." } };
  const col = isObj(doc.collection) ? doc.collection : doc;
  if (!Array.isArray(col.item)) return { output: "", error: { message: "No item array found. Export the collection as Collection v2.1 (or v2.0) JSON." } };
  const vars = new Map(arr(col.variable).filter((v) => !v.disabled).map((v) => [str(v.key), str(v.value)]));
  const reqs = collectRequests(col.item, isObj(col.auth) ? col.auth : null);
  if (reqs.length === 0) return { output: "", error: { message: "The collection has no requests." } };

  const ps = options.shell === "powershell";
  const q = (s: string) => (ps ? `'${s.replace(/'/g, "''")}'` : `'${s.replace(/'/g, `'\\''`)}'`);
  const cont = ps ? " `\n  " : " \\\n  ";
  const unresolved = new Set<string>();
  const sub = (s: string) => s.replace(/\{\{\s*([\w.$-]+)\s*\}\}/g, (m, name: string) => {
    if (options.variables === "resolve" && vars.has(name)) return vars.get(name)!;
    if (options.variables === "keep") { unresolved.add(name); return m; }
    unresolved.add(name);
    const env = name.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
    return options.variables === "env" || !vars.has(name) ? (ps ? `$env:${env}` : `\${${env}}`) : m;
  });
  // single quotes stop shell expansion, so variables need double quotes
  const arg = (s: string) => { const v = sub(s); return /\$\{|\$env:/.test(v) ? (ps ? `"${v.replace(/[`"]/g, "`$&")}"` : `"${v.replace(/(["\\`])/g, "\\$1")}"`) : q(v); };
  const mask = (k: string, v: string) => (options.maskSecrets && SECRET_HEADER.test(k) ? v.replace(/^(Bearer |Basic )?.*$/i, (_, p: string | undefined) => `${p ?? ""}********`) : v);

  const blocks = reqs.map((r) => {
    const parts: string[] = [`${ps ? "curl.exe" : "curl"}${r.method !== "GET" || r.body ? ` -X ${r.method}` : ""} ${arg(r.url)}`];
    const notes: string[] = [];
    for (const [k, v] of r.headers) {
      if (k === "__basic__") parts.push(`-u ${arg(mask(k, v))}`);
      else if (k === "__unsupported__") notes.push(`# auth type "${v}" is not converted; add its headers by hand`);
      else parts.push(`-H ${arg(`${k}: ${mask(k, v)}`)}`);
    }
    if (r.body?.kind === "raw") parts.push(`--data-raw ${arg(r.body.raw!)}`);
    if (r.body?.kind === "urlencoded") for (const [k, v] of r.body.pairs!) parts.push(`--data-urlencode ${arg(`${k}=${v}`)}`);
    if (r.body?.kind === "form") for (const [k, v, file] of r.body.pairs!) parts.push(`-F ${arg(file ? `${k}=@${v}` : `${k}=${v}`)}`);
    return `# ${r.path.join(" / ")}\n${notes.length ? `${notes.join("\n")}\n` : ""}${parts.join(cont)}`;
  });
  const header: string[] = [];
  if (ps) header.push("# PowerShell: use curl.exe (curl is an alias of Invoke-WebRequest in Windows PowerShell 5.1). JSON bodies need PowerShell 7.3+ to pass embedded quotes intact.");
  if (unresolved.size && options.variables !== "resolve") header.push(`# Variables: ${[...unresolved].join(", ")}`);
  else if (unresolved.size) header.push(`# Not defined in the collection, read from the environment: ${[...unresolved].map((n) => n.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()).join(", ")}`);
  return { output: `${header.length ? `${header.join("\n")}\n\n` : ""}${blocks.join("\n\n")}`, error: null };
}
