import type { TransformResult } from "@/lib/tool-transform";
import type { CookieParserOptions } from "./schema";

function safeDecode(v: string): string {
  try { return decodeURIComponent(v); } catch { return v; }
}

export function parseCookieHeader(header: string): [string, string][] {
  return header.replace(/^cookie:\s*/i, "").split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
    const i = p.indexOf("=");
    return i < 0 ? [p, ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
  });
}

export function parseSetCookie(line: string): { name: string; value: string; attrs: Record<string, string | true>; warnings: string[] } | null {
  const parts = line.replace(/^set-cookie:\s*/i, "").split(";").map((p) => p.trim()).filter(Boolean);
  const first = parts.shift();
  if (!first || !first.includes("=")) return null;
  const i = first.indexOf("=");
  const name = first.slice(0, i).trim();
  const value = first.slice(i + 1).trim();
  const attrs: Record<string, string | true> = {};
  for (const p of parts) {
    const j = p.indexOf("=");
    if (j < 0) attrs[p.toLowerCase()] = true;
    else attrs[p.slice(0, j).trim().toLowerCase()] = p.slice(j + 1).trim();
  }
  const w: string[] = [];
  const sameSite = typeof attrs.samesite === "string" ? attrs.samesite.toLowerCase() : "";
  if (!attrs.secure) w.push("No Secure flag — the cookie is sent over plain HTTP too.");
  if (!attrs.httponly) w.push("No HttpOnly flag — JavaScript can read it (XSS can steal it).");
  if (!sameSite) w.push("No SameSite attribute — browsers default to Lax, but older ones allow cross-site sending.");
  if (sameSite === "none" && !attrs.secure) w.push("SameSite=None requires Secure; browsers will reject this cookie.");
  if (name.startsWith("__Host-") && (!attrs.secure || attrs.domain || attrs.path !== "/")) w.push("__Host- prefix requires Secure, Path=/ and no Domain.");
  if (name.startsWith("__Secure-") && !attrs.secure) w.push("__Secure- prefix requires the Secure flag.");
  if (attrs["max-age"] !== undefined && Number.isNaN(Number(attrs["max-age"]))) w.push("Max-Age is not a number.");
  if (!attrs["max-age"] && !attrs.expires) w.push("No Max-Age/Expires — this is a session cookie.");
  return { name, value, attrs, warnings: w };
}

export function parseCookies(input: string, options: CookieParserOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const isSet = options.mode === "set-cookie" || (options.mode === "auto" && (/^set-cookie:/i.test(line) || /;\s*(secure|httponly|path=|samesite=|max-age=|expires=|domain=)/i.test(line)));
    if (isSet) {
      const c = parseSetCookie(line);
      if (!c) return { output: "", error: { message: "Expected name=value at the start of a Set-Cookie header.", line: i + 1 } };
      const rows = [`Set-Cookie  ${c.name}`, `  value     ${options.decode ? safeDecode(c.value) : c.value}`];
      for (const [k, v] of Object.entries(c.attrs)) rows.push(`  ${k.padEnd(9)} ${v === true ? "yes" : v}`);
      if (c.warnings.length) rows.push("  review:", ...c.warnings.map((x) => `    ! ${x}`));
      out.push(rows.join("\n"));
    } else {
      const pairs = parseCookieHeader(line);
      out.push(["Cookie header", ...pairs.map(([k, v]) => `  ${k} = ${options.decode ? safeDecode(v) : v}`)].join("\n"));
    }
  }
  return { output: out.join("\n\n"), error: null };
}
