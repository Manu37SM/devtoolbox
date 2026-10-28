import type { TransformResult } from "@/lib/tool-transform";
import type { GlobPatternTesterOptions } from "./schema";

/** Expand {a,b} and {1..3} braces (nestable). */
export function expandBraces(pattern: string, limit = 500): string[] {
  const start = (() => {
    let depth = 0, first = -1;
    for (let i = 0; i < pattern.length; i++) {
      const c = pattern[i];
      if (c === "\\") { i++; continue; }
      if (c === "{") { if (depth === 0) first = i; depth++; }
      else if (c === "}" && depth > 0) { depth--; if (depth === 0) return [first, i] as const; }
    }
    return null;
  })();
  if (!start) return [pattern];
  const [a, b] = start;
  const pre = pattern.slice(0, a), body = pattern.slice(a + 1, b), post = pattern.slice(b + 1);
  const range = /^(-?\d+)\.\.(-?\d+)$/.exec(body);
  const alts: string[] = [];
  if (range) {
    const lo = Number(range[1]), hi = Number(range[2]);
    const step = lo <= hi ? 1 : -1;
    for (let v = lo; step > 0 ? v <= hi : v >= hi; v += step) { alts.push(String(v)); if (alts.length > limit) break; }
  } else {
    let depth = 0, cur = "";
    for (let i = 0; i < body.length; i++) {
      const c = body[i]!;
      if (c === "\\") { cur += c + (body[++i] ?? ""); continue; }
      if (c === "{") depth++;
      if (c === "}") depth--;
      if (c === "," && depth === 0) { alts.push(cur); cur = ""; } else cur += c;
    }
    alts.push(cur);
    if (alts.length === 1) return [pre + "\\{" + body + "\\}" + post].flatMap((p) => expandBraces(p.replace("\\{", "\u0001").replace("\\}", "\u0002"), limit).map((x) => x.replace("\u0001", "\\{").replace("\u0002", "\\}")));
  }
  const out: string[] = [];
  for (const alt of alts) {
    for (const e of expandBraces(pre + alt + post, limit)) { out.push(e); if (out.length > limit) return out; }
  }
  return out;
}

/** Convert one brace-free glob into a RegExp source matching a whole POSIX path. */
export function globToRegexSource(glob: string, dot: boolean): string {
  const segStartGuard = dot ? "" : "(?!\\.)";
  let re = "";
  let atSegStart = true;
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        let j = i;
        while (glob[j] === "*") j++;
        const prevSlash = i === 0 || glob[i - 1] === "/";
        if (prevSlash && (glob[j] === "/" || j === glob.length)) {
          // globstar segment: zero or more whole directories
          if (glob[j] === "/") { re += `(?:${segStartGuard}[^/]+/)*`; i = j; } else { re += `(?:${segStartGuard}[^/]+(?:/${segStartGuard}[^/]+)*)?`; i = j - 1; }
          atSegStart = true;
          continue;
        }
        re += (atSegStart ? segStartGuard : "") + "[^/]*";
        i = j - 1;
        atSegStart = false;
        continue;
      }
      re += (atSegStart ? segStartGuard : "") + "[^/]*";
      atSegStart = false;
    } else if (c === "?") {
      re += (atSegStart ? segStartGuard : "") + "[^/]";
      atSegStart = false;
    } else if (c === "[") {
      const end = glob.indexOf("]", i + 2);
      if (end < 0) { re += "\\["; atSegStart = false; continue; }
      let body = glob.slice(i + 1, end);
      const neg = body[0] === "!" || body[0] === "^";
      if (neg) body = body.slice(1);
      re += (atSegStart ? segStartGuard : "") + `[${neg ? "^" : ""}${body.replace(/[\\\]]/g, "\\$&")}${neg ? "/" : ""}]`;
      i = end;
      atSegStart = false;
    } else if (c === "\\" && i + 1 < glob.length) {
      re += glob[++i]!.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
      atSegStart = false;
    } else if (c === "/") {
      re += "/";
      atSegStart = true;
    } else {
      re += c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      atSegStart = false;
    }
  }
  return re;
}

export function compileGlob(pattern: string, opts: { dot: boolean; ignoreCase: boolean }): RegExp {
  const parts = expandBraces(pattern).map((p) => globToRegexSource(p, opts.dot));
  return new RegExp(`^(?:${parts.join("|")})$`, opts.ignoreCase ? "i" : "");
}

export interface IgnoreRule { negate: boolean; dirOnly: boolean; re: RegExp; raw: string }

export function compileIgnoreRule(line: string, opts: { ignoreCase: boolean }): IgnoreRule | null {
  let p = line.replace(/\s+$/, "");
  if (!p || p.startsWith("#")) return null;
  let negate = false;
  if (p.startsWith("!")) { negate = true; p = p.slice(1); }
  if (p.startsWith("\\#") || p.startsWith("\\!")) p = p.slice(1);
  let dirOnly = false;
  if (p.endsWith("/")) { dirOnly = true; p = p.slice(0, -1); }
  const anchored = p.includes("/");
  p = p.replace(/^\//, "");
  if (!p) return null;
  const glob = anchored ? p : `**/${p}`;
  // dot:true — gitignore patterns match dotfiles normally
  return { negate, dirOnly, re: compileGlob(glob, { dot: true, ignoreCase: opts.ignoreCase }), raw: line.trim() };
}

/** gitignore semantics: last matching rule wins; an ignored parent directory ignores everything inside. */
export function isIgnored(path: string, rules: IgnoreRule[]): { ignored: boolean; rule?: string } {
  const isDir = path.endsWith("/");
  const clean = path.replace(/\/+$/, "");
  const segs = clean.split("/");
  let ignored = false;
  let by: string | undefined;
  for (let n = 1; n <= segs.length; n++) {
    const sub = segs.slice(0, n).join("/");
    const subIsDir = n < segs.length || isDir;
    for (const r of rules) {
      if (r.dirOnly && !subIsDir) continue;
      if (r.re.test(sub)) { ignored = !r.negate; by = r.raw; }
    }
    if (ignored && n < segs.length) return { ignored: true, rule: by };
  }
  return { ignored, rule: by };
}

export function testGlobs(input: string, options: GlobPatternTesterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const lines = input.split(/\r?\n/);
  const sep = lines.findIndex((l) => l.trim() === "---");
  if (sep < 0) return { output: "", error: { message: 'Put the pattern(s) first, then a line with --- , then the paths to test (one per line)' } };
  const patterns = lines.slice(0, sep).map((l) => l.trim()).filter((l) => l && (options.mode === "gitignore" || !l.startsWith("#")));
  const paths = lines.slice(sep + 1).map((l) => l.trim().replace(/^\.\//, "")).filter(Boolean);
  if (!patterns.length) return { output: "", error: { message: "No pattern given above the --- line" } };
  try {
    if (options.mode === "gitignore") {
      const rules = patterns.map((p) => compileIgnoreRule(p, options)).filter((r): r is IgnoreRule => r !== null);
      const out = paths.map((p) => {
        const r = isIgnored(p, rules);
        return `${r.ignored ? "IGNORED " : "tracked "} ${p}${r.rule ? `   ← ${r.rule}` : ""}`;
      });
      const n = out.filter((l) => l.startsWith("IGNORED")).length;
      return { output: `${out.join("\n")}\n\n${n} ignored, ${paths.length - n} tracked`, error: null };
    }
    // "!pattern" lines exclude paths that an earlier positive pattern would match
    const positive = patterns.filter((p) => !p.startsWith("!")).map((p) => ({ p, re: compileGlob(p, options) }));
    const negative = patterns.filter((p) => p.startsWith("!")).map((p) => ({ p, re: compileGlob(p.slice(1), options) }));
    if (!positive.length) return { output: "", error: { message: "Add at least one pattern that does not start with !" } };
    const out = paths.map((path) => {
      const hits = positive.filter((c) => c.re.test(path)).map((c) => c.p);
      const excluded = negative.find((c) => c.re.test(path));
      if (hits.length && excluded) return `✗ excluded  ${path}   ← ${excluded.p}`;
      return `${hits.length ? "✓ match   " : "✗ no match"}  ${path}${hits.length ? `   ← ${hits.join(", ")}` : ""}`;
    });
    const n = out.filter((l) => l.startsWith("✓")).length;
    return { output: `${out.join("\n")}\n\n${n} of ${paths.length} path(s) matched`, error: null };
  } catch (e) {
    return { output: "", error: { message: `Invalid pattern: ${(e as Error).message}` } };
  }
}
