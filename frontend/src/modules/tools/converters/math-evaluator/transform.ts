import type { TransformResult } from "@/lib/tool-transform";
import type { MathEvaluatorOptions } from "./schema";

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

const FUNCS: Record<string, (...a: number[]) => number> = {
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: Math.log10, log2: Math.log2, exp: Math.exp,
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  floor: Math.floor, ceil: Math.ceil, round: Math.round, sign: Math.sign,
  min: Math.min, max: Math.max, pow: Math.pow,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI };

function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|([a-z_][a-z0-9_]*)|(\*\*|[-+*/%^(),]))/giy;
  let pos = 0;
  while (pos < src.length) {
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) {
      if (/^\s*$/.test(src.slice(pos))) break;
      throw new Error(`Unexpected character "${src.slice(pos).trim()[0]}"`);
    }
    if (m[1] !== undefined) toks.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) toks.push({ t: "id", v: m[2].toLowerCase() });
    else toks.push({ t: "op", v: m[3] === "**" ? "^" : m[3]! });
    pos = re.lastIndex;
  }
  return toks;
}

/** Recursive-descent parser; no eval/Function. Precedence: ^ (right) > unary - > * / % > + - */
export function evaluate(src: string, angle: "rad" | "deg" = "rad", vars: Record<string, number> = {}): number {
  const toks = lex(src);
  let i = 0;
  const peek = () => toks[i];
  const eat = (v: string) => { const t = peek(); if (t?.t === "op" && t.v === v) { i++; return true; } return false; };

  const expr = (): number => {
    let v = term();
    for (;;) {
      if (eat("+")) v += term();
      else if (eat("-")) v -= term();
      else return v;
    }
  };
  const term = (): number => {
    let v = unary();
    for (;;) {
      if (eat("*")) v *= unary();
      else if (eat("/")) v /= unary();
      else if (eat("%")) v %= unary();
      else return v;
    }
  };
  const unary = (): number => {
    if (eat("-")) return -unary();
    if (eat("+")) return unary();
    return power();
  };
  const power = (): number => {
    const base = atom();
    return eat("^") ? base ** unary() : base; // right-assoc, allows 2^-1
  };
  const toRad = (x: number) => (angle === "deg" ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (angle === "deg" ? (x * 180) / Math.PI : x);
  const atom = (): number => {
    const t = toks[i++];
    if (!t) throw new Error("Unexpected end of expression");
    if (t.t === "num") return t.v;
    if (t.t === "op" && t.v === "(") {
      const v = expr();
      if (!eat(")")) throw new Error('Missing closing ")"');
      return v;
    }
    if (t.t === "id") {
      if (eat("(")) {
        const args: number[] = [];
        if (!eat(")")) {
          do args.push(expr()); while (eat(","));
          if (!eat(")")) throw new Error('Missing closing ")"');
        }
        const fn = Object.hasOwn(FUNCS, t.v) ? FUNCS[t.v] : undefined;
        if (!fn) throw new Error(`Unknown function "${t.v}"`);
        if (["sin", "cos", "tan"].includes(t.v)) return fn(...args.map(toRad));
        if (["asin", "acos", "atan"].includes(t.v)) return fromRad(fn(...args));
        return fn(...args);
      }
      if (Object.hasOwn(vars, t.v)) return vars[t.v]!;
      if (Object.hasOwn(CONSTS, t.v)) return CONSTS[t.v]!;
      throw new Error(`Unknown name "${t.v}"`);
    }
    throw new Error(`Unexpected "${t.v}"`);
  };

  const result = expr();
  if (i < toks.length) throw new Error(`Unexpected "${(toks[i] as { v: string | number }).v}"`);
  return result;
}

export function formatNumber(n: number, precision: number): string {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? "NaN" : n > 0 ? "Infinity" : "-Infinity";
  const rounded = Number(n.toPrecision(precision));
  if (Math.abs(rounded) >= 1e21 || (rounded !== 0 && Math.abs(rounded) < 1e-9)) return rounded.toExponential();
  return String(rounded);
}

export function evaluateLines(input: string, options: MathEvaluatorOptions): TransformResult {
  const lines = input.split(/\r?\n/);
  const out: string[] = [];
  const vars: Record<string, number> = Object.create(null) as Record<string, number>;
  let any = false;
  for (const [i, raw] of lines.entries()) {
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (!line) { out.push(""); continue; }
    any = true;
    try {
      const assign = /^([a-z_][a-z0-9_]*)\s*=\s*(.+)$/i.exec(line);
      const value = evaluate(assign ? assign[2]! : options.allowCommas ? line.replace(/(\d),(?=\d{3}(?!\d))/g, "$1") : line, options.angle, vars);
      if (assign) vars[assign[1]!.toLowerCase()] = value;
      out.push(`${assign ? `${assign[1]} = ` : ""}${formatNumber(value, options.precision)}`);
    } catch (e) {
      return { output: "", error: { message: e instanceof Error ? e.message : "Invalid expression", line: i + 1 } };
    }
  }
  return { output: any ? out.join("\n") : "", error: null };
}
