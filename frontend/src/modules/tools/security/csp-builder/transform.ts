import type { TransformResult } from "@/lib/tool-transform";
import type { CspBuilderOptions } from "./schema";

const FETCH = ["default-src", "script-src", "style-src", "img-src", "font-src", "connect-src", "media-src", "frame-src", "worker-src", "manifest-src", "child-src", "object-src"];
const KNOWN = new Set([...FETCH, "base-uri", "form-action", "frame-ancestors", "report-uri", "report-to", "sandbox", "upgrade-insecure-requests", "script-src-elem", "script-src-attr", "style-src-elem", "style-src-attr", "navigate-to", "require-trusted-types-for", "trusted-types"]);
const KEYWORDS = new Set(["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "'strict-dynamic'", "'unsafe-hashes'", "'wasm-unsafe-eval'", "'report-sample'"]);

/** Extra rules, one per line: "script-src https://cdn.example.com https://x.y". */
export function parseExtras(input: string): { map: Map<string, string[]>; problems: string[] } {
  const map = new Map<string, string[]>();
  const problems: string[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim().replace(/;$/, "");
    if (!line || line.startsWith("#")) continue;
    const [dir, ...srcs] = line.split(/\s+/);
    const d = dir!.toLowerCase();
    if (!KNOWN.has(d)) { problems.push(`Unknown directive "${dir}"`); continue; }
    for (const s of srcs) {
      const ok = KEYWORDS.has(s.toLowerCase()) || /^'(nonce|sha256|sha384|sha512)-[A-Za-z0-9+/=_-]+'$/.test(s) || /^(https?|wss?|data|blob|filesystem|mediastream):$/i.test(s) || /^(https?:\/\/|wss?:\/\/)?(\*\.)?[A-Za-z0-9.-]+(:\d+|:\*)?(\/[^\s;,]*)?$/.test(s) || s === "*";
      if (!ok) problems.push(`Suspicious source "${s}" in ${d}`);
    }
    map.set(d, [...(map.get(d) ?? []), ...srcs]);
  }
  return { map, problems };
}

export function buildPolicy(o: CspBuilderOptions, extras: Map<string, string[]>): Map<string, string[]> {
  const p = new Map<string, string[]>();
  p.set("default-src", [o.defaultSrc === "self" ? "'self'" : "'none'"]);
  if (o.defaultSrc === "none") {
    p.set("script-src", ["'self'"]); p.set("style-src", ["'self'"]); p.set("img-src", ["'self'"]); p.set("connect-src", ["'self'"]); p.set("font-src", ["'self'"]);
  }
  if (o.inlineScripts || o.evalScripts) {
    const s = p.get("script-src") ?? ["'self'"];
    if (o.inlineScripts) s.push("'unsafe-inline'");
    if (o.evalScripts) s.push("'unsafe-eval'");
    p.set("script-src", s);
  }
  if (o.inlineStyles) p.set("style-src", [...(p.get("style-src") ?? ["'self'"]), "'unsafe-inline'"]);
  if (o.allowData) p.set("img-src", [...(p.get("img-src") ?? ["'self'"]), "data:"]);
  if (o.blockObjects) p.set("object-src", ["'none'"]);
  if (o.baseUri) p.set("base-uri", ["'self'"]);
  if (o.formAction) p.set("form-action", ["'self'"]);
  if (o.frameAncestors !== "unset") p.set("frame-ancestors", [o.frameAncestors === "none" ? "'none'" : "'self'"]);
  for (const [dir, srcs] of extras) {
    const cur = p.get(dir) ?? (FETCH.includes(dir) && dir !== "default-src" && p.has("default-src") ? [...p.get("default-src")!] : []);
    // once a directive is specified it no longer inherits default-src, so seed it from default-src (above) then add
    const merged = [...cur.filter((x) => !(x === "'none'" && srcs.length)), ...srcs];
    p.set(dir, [...new Set(merged)]);
  }
  if (o.upgradeInsecure) p.set("upgrade-insecure-requests", []);
  return p;
}

export function analyze(p: Map<string, string[]>): string[] {
  const w: string[] = [];
  const scripts = p.get("script-src") ?? p.get("default-src") ?? [];
  if (scripts.includes("'unsafe-inline'")) w.push("script-src 'unsafe-inline' allows inline <script> and event handlers — most XSS protection is lost. Prefer nonces or hashes.");
  if (scripts.includes("'unsafe-eval'")) w.push("'unsafe-eval' permits eval()/new Function(); avoid unless a library requires it.");
  for (const [d, s] of p) {
    if (s.includes("*") ) w.push(`${d} contains a bare * wildcard — any host is allowed.`);
    if (s.some((x) => x.toLowerCase() === "http:")) w.push(`${d} allows plain http: sources.`);
    if (s.some((x) => x.toLowerCase() === "data:") && (d === "script-src" || d === "default-src" || d === "object-src")) w.push(`data: in ${d} is dangerous (script injection).`);
  }
  if (!p.has("object-src") && !(p.get("default-src") ?? []).includes("'none'")) w.push("object-src is not restricted; add object-src 'none'.");
  if (!p.has("base-uri")) w.push("base-uri is missing — injected <base> tags can hijack relative URLs.");
  if (!p.has("frame-ancestors")) w.push("frame-ancestors is not set, so the page can be framed (clickjacking).");
  if (scripts.some((x) => /^'(nonce|sha\d+)-/.test(x)) && scripts.includes("'unsafe-inline'")) w.push("Modern browsers ignore 'unsafe-inline' when a nonce/hash is present; it only serves as a fallback.");
  return w;
}

export function buildCsp(input: string, options: CspBuilderOptions): TransformResult {
  const { map, problems } = parseExtras(input);
  const policy = buildPolicy(options, map);
  const value = [...policy].map(([d, s]) => (s.length ? `${d} ${s.join(" ")}` : d)).join("; ");
  const name = options.reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
  const metaSafe = [...policy].filter(([d]) => !["frame-ancestors", "report-uri", "report-to", "sandbox"].includes(d)).map(([d, s]) => (s.length ? `${d} ${s.join(" ")}` : d)).join("; ");
  const w = analyze(policy);
  const out = [
    `${name}: ${value}`,
    "",
    "<meta> form (frame-ancestors, report-uri and sandbox are ignored in meta tags" + (options.reportOnly ? "; Report-Only is header-only" : "") + "):",
    options.reportOnly ? "  (not available for Report-Only)" : `<meta http-equiv="Content-Security-Policy" content="${metaSafe.replace(/"/g, "&quot;")}">`,
    "",
    "Nginx:   add_header " + name + ' "' + value.replace(/"/g, '\\"') + '" always;',
    "Apache:  Header always set " + name + ' "' + value.replace(/"/g, '\\"') + '"',
    "Express: res.setHeader('" + name + "', '" + value.replace(/'/g, "\\'") + "');",
  ];
  if (w.length) out.push("", "Review:", ...w.map((x) => `  ⚠ ${x}`));
  if (problems.length) out.push("", "Input issues:", ...problems.map((x) => `  ✗ ${x}`));
  return { output: out.join("\n"), error: problems.length ? { message: problems[0]! } : null };
}
