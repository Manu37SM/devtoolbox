import type { TransformResult } from "@/lib/tool-transform";
import type { CssSpecificityCalculatorOptions } from "./schema";

export type Spec = [number, number, number];
const add = (x: Spec, y: Spec): Spec => [x[0] + y[0], x[1] + y[1], x[2] + y[2]];
export const cmp = (x: Spec, y: Spec) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
const max = (list: Spec[]): Spec => list.reduce((m, s) => (cmp(s, m) > 0 ? s : m), [0, 0, 0] as Spec);

/** Split on top-level commas (not inside parentheses, brackets or strings). */
export function splitList(s: string): string[] {
  const out: string[] = [];
  let d = 0, cur = "", q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (q) { cur += ch; if (ch === "\\") { cur += s[++i] ?? ""; } else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[") d++;
    if (ch === ")" || ch === "]") d--;
    if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

const LEGACY_PSEUDO_ELEMENTS = new Set(["before", "after", "first-line", "first-letter"]);
const IDENT = /^-?(?:[_a-zA-Z -￿]|\\.)(?:[-\w -￿]|\\.)*/;

function readParens(s: string, i: number): [string, number] {
  let d = 0, j = i, q: string | null = null;
  for (; j < s.length; j++) {
    const ch = s[j]!;
    if (q) { if (ch === "\\") j++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === "(") d++;
    else if (ch === ")" && --d === 0) break;
  }
  if (d !== 0 && j >= s.length) throw new Error("Unbalanced parentheses");
  return [s.slice(i + 1, j), j + 1];
}

/** Specificity of one complex selector (no top-level commas). */
export function specificity(sel: string): Spec {
  let a = 0, b = 0, c = 0;
  let i = 0;
  const s = sel.trim();
  if (!s) throw new Error("Empty selector");
  while (i < s.length) {
    const ch = s[i]!;
    if (/[\s>+~]/.test(ch)) { i++; continue; }
    if (ch === "|" && s[i + 1] === "|") { i += 2; continue; }
    if (ch === "*") { i++; if (s[i] === "|") i++; continue; }
    if (ch === "#") { const m = IDENT.exec(s.slice(i + 1)); if (!m) throw new Error(`Bad id at "${s.slice(i)}"`); a++; i += 1 + m[0].length; continue; }
    if (ch === ".") { const m = IDENT.exec(s.slice(i + 1)); if (!m) throw new Error(`Bad class at "${s.slice(i)}"`); b++; i += 1 + m[0].length; continue; }
    if (ch === "[") {
      let j = i + 1, q: string | null = null;
      for (; j < s.length; j++) { const x = s[j]!; if (q) { if (x === "\\") j++; else if (x === q) q = null; } else if (x === '"' || x === "'") q = x; else if (x === "]") break; }
      if (j >= s.length) throw new Error("Unclosed attribute selector");
      b++; i = j + 1; continue;
    }
    if (ch === ":") {
      const isElement = s[i + 1] === ":";
      const start = i + (isElement ? 2 : 1);
      const m = IDENT.exec(s.slice(start));
      if (!m) throw new Error(`Bad pseudo selector at "${s.slice(i)}"`);
      const name = m[0].toLowerCase();
      i = start + m[0].length;
      let arg: string | null = null;
      if (s[i] === "(") { [arg, i] = readParens(s, i); }
      if (isElement || LEGACY_PSEUDO_ELEMENTS.has(name)) {
        c++;
        if (arg !== null && name === "slotted") [a, b, c] = add([a, b, c], max(splitList(arg).map(specificity)));
        continue;
      }
      if (name === "where") continue;
      if (name === "is" || name === "not" || name === "has" || name === "matches" || name === "-webkit-any" || name === "-moz-any") {
        [a, b, c] = add([a, b, c], max(splitList(arg ?? "").map(specificity)));
        continue;
      }
      b++;
      if ((name === "nth-child" || name === "nth-last-child") && arg) {
        const of = /\bof\s+([\s\S]+)$/i.exec(arg);
        if (of) [a, b, c] = add([a, b, c], max(splitList(of[1]!).map(specificity)));
      }
      if ((name === "host" || name === "host-context") && arg) [a, b, c] = add([a, b, c], max(splitList(arg).map(specificity)));
      continue;
    }
    const m = IDENT.exec(s.slice(i));
    if (m) { c++; i += m[0].length; if (s[i] === "|" && s[i + 1] !== "|" ) { i++; const t = IDENT.exec(s.slice(i)); if (t) i += t[0].length; } continue; }
    if (ch === "&") { i++; continue; }
    throw new Error(`Unexpected "${ch}" in "${s}"`);
  }
  return [a, b, c];
}

export function runCssSpecificityCalculator(input: string, options: CssSpecificityCalculatorOptions): TransformResult {
  const raw = input.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).map((l) => l.replace(/\{[\s\S]*$/, "").trim()).filter(Boolean);
  if (raw.length === 0) return { output: "", error: null };
  const rows: { sel: string; spec: Spec; order: number }[] = [];
  try {
    for (const line of raw) for (const sel of splitList(line)) rows.push({ sel, spec: specificity(sel), order: rows.length });
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
  const sorted = options.sort === "specificity" ? [...rows].sort((x, y) => cmp(y.spec, x.spec) || y.order - x.order) : rows;
  const best = rows.reduce((m, r) => (cmp(r.spec, m.spec) > 0 || (cmp(r.spec, m.spec) === 0 && r.order > m.order) ? r : m), rows[0]!);
  const width = Math.max(...rows.map((r) => r.sel.length), 8);
  const lines = sorted.map((r) => (r === best && rows.length > 1 ? `${r.spec.join(",").padEnd(9)}${r.sel.padEnd(width)}  <- wins` : `${r.spec.join(",").padEnd(9)}${r.sel}`));
  return {
    output: [`(a,b,c)  selector`, ...lines, "", "a = IDs; b = classes, attributes, pseudo-classes; c = types, pseudo-elements.", "Equal specificity: the rule that appears later wins. Inline styles and !important beat any selector."].join("\n"),
    error: null,
  };
}
