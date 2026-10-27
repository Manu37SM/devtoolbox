import type { TransformResult } from "@/lib/tool-transform";
import type { HttpHeaderAnalyzerOptions } from "./schema";

export function parseHeaders(raw: string): { status: string | null; headers: [string, string][] } {
  const lines = raw.split(/\r?\n/);
  let status: string | null = null;
  const headers: [string, string][] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    if (/^HTTP\/[\d.]+\s+\d{3}/i.test(line)) { status = line.trim(); continue; }
    if (/^\s/.test(line) && headers.length) { headers[headers.length - 1]![1] += ` ${line.trim()}`; continue; } // obs-fold
    const i = line.indexOf(":");
    if (i > 0) headers.push([line.slice(0, i).trim(), line.slice(i + 1).trim()]);
  }
  return { status, headers };
}

interface Finding { level: "fail" | "warn" | "ok"; text: string }

export function analyze(headers: [string, string][]): Finding[] {
  const get = (n: string) => headers.filter(([k]) => k.toLowerCase() === n).map(([, v]) => v);
  const one = (n: string) => get(n)[0];
  const f: Finding[] = [];
  const add = (level: Finding["level"], text: string) => f.push({ level, text });

  const hsts = one("strict-transport-security");
  if (!hsts) add("fail", "Strict-Transport-Security missing — browsers may be downgraded to HTTP.");
  else {
    const age = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0);
    add(age >= 15552000 ? "ok" : "warn", age >= 15552000 ? `HSTS max-age ${age}s.` : `HSTS max-age is ${age}s; use at least 15552000 (180 days), ideally 31536000.`);
  }
  const csp = one("content-security-policy");
  if (!csp) add("fail", "Content-Security-Policy missing — no defence-in-depth against XSS.");
  else if (/unsafe-inline|unsafe-eval|script-src[^;]*\*/i.test(csp)) add("warn", "CSP allows 'unsafe-inline', 'unsafe-eval' or a wildcard script source, which weakens it.");
  else add("ok", "Content-Security-Policy present.");
  if (one("x-content-type-options")?.toLowerCase() === "nosniff") add("ok", "X-Content-Type-Options: nosniff.");
  else add("fail", "X-Content-Type-Options: nosniff missing.");
  if (one("x-frame-options") || /frame-ancestors/i.test(csp ?? "")) add("ok", "Clickjacking protection present (X-Frame-Options or frame-ancestors).");
  else add("fail", "No clickjacking protection (X-Frame-Options / CSP frame-ancestors).");
  if (!one("referrer-policy")) add("warn", "Referrer-Policy missing (browsers default to strict-origin-when-cross-origin).");
  if (!one("permissions-policy")) add("warn", "Permissions-Policy missing — powerful browser features are not restricted.");

  const server = one("server");
  if (server && /\d/.test(server)) add("warn", `Server discloses version: "${server}".`);
  const powered = one("x-powered-by");
  if (powered) add("warn", `X-Powered-By discloses the stack: "${powered}".`);

  const acao = one("access-control-allow-origin");
  const acac = one("access-control-allow-credentials");
  if (acao === "*" && acac?.toLowerCase() === "true") add("fail", "CORS: wildcard origin with credentials — browsers reject this and it signals a misconfiguration.");
  else if (acao === "*") add("warn", "CORS allows any origin (*). Fine for public data, not for authenticated APIs.");
  else if (acao?.toLowerCase() === "null") add("fail", 'CORS allows origin "null", which sandboxed iframes and local files can send.');

  for (const c of get("set-cookie")) {
    const name = c.split("=")[0];
    const miss = [!/;\s*secure/i.test(c) && "Secure", !/;\s*httponly/i.test(c) && "HttpOnly", !/;\s*samesite=/i.test(c) && "SameSite"].filter(Boolean);
    if (miss.length) add("warn", `Cookie "${name}" is missing ${miss.join(", ")}.`);
  }
  const cc = one("cache-control");
  if (!cc && !one("expires")) add("warn", "No Cache-Control — intermediaries may cache responses unpredictably.");
  return f;
}

export function analyzeHeaders(input: string, options: HttpHeaderAnalyzerOptions): TransformResult {
  if (input.trim() === "") return { output: "", error: null };
  const { status, headers } = parseHeaders(input);
  if (headers.length === 0) return { output: "", error: { message: 'No headers found. Paste lines like "Content-Type: text/html".' } };
  const out: string[] = [];
  if (status) out.push(status, "");
  out.push(`${headers.length} header${headers.length === 1 ? "" : "s"}:`);
  const width = Math.min(30, Math.max(...headers.map(([k]) => k.length)));
  for (const [k, v] of headers) out.push(`  ${k.padEnd(width)}  ${v}`);
  if (options.security) {
    const findings = analyze(headers);
    const icon = { fail: "✗", warn: "!", ok: "✓" } as const;
    out.push("", "Security review:", ...findings.sort((a, b) => ["fail", "warn", "ok"].indexOf(a.level) - ["fail", "warn", "ok"].indexOf(b.level)).map((x) => `  ${icon[x.level]} ${x.text}`));
    out.push("", "Heuristic checks on the headers you pasted — they can't see other responses, TLS config or what the app actually needs.");
  }
  return { output: out.join("\n"), error: null };
}
