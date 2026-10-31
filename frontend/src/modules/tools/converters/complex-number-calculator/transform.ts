import type { TransformResult } from "@/lib/tool-transform";
import type { ComplexNumberCalculatorOptions } from "./schema";

type Opts = ComplexNumberCalculatorOptions;

export interface C {
  re: number;
  im: number;
}
const c = (re: number, im = 0): C => ({ re, im });
const ZERO = c(0);
const ONE = c(1);
const I = c(0, 1);

export const add = (a: C, b: C) => c(a.re + b.re, a.im + b.im);
export const sub = (a: C, b: C) => c(a.re - b.re, a.im - b.im);
export const mul = (a: C, b: C) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export function div(a: C, b: C): C {
  if (b.re === 0 && b.im === 0) throw new Error("Division by zero");
  // Smith's algorithm avoids overflow in the intermediate products
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const d = b.re + b.im * r;
    return c((a.re + a.im * r) / d, (a.im - a.re * r) / d);
  }
  const r = b.re / b.im;
  const d = b.re * r + b.im;
  return c((a.re * r + a.im) / d, (a.im * r - a.re) / d);
}
export const abs = (a: C) => Math.hypot(a.re, a.im);
export const arg = (a: C) => Math.atan2(a.im, a.re);
export const conj = (a: C) => c(a.re, -a.im);
export const fromPolar = (r: number, th: number) => c(r * Math.cos(th), r * Math.sin(th));
const scale = (a: C, k: number) => c(a.re * k, a.im * k);
const isZero = (a: C) => a.re === 0 && a.im === 0;

export function exp(a: C): C {
  return fromPolar(Math.exp(a.re), a.im);
}
export function ln(a: C): C {
  if (isZero(a)) throw new Error("ln(0) is undefined");
  return c(Math.log(abs(a)), arg(a));
}
export function sqrt(a: C): C {
  if (isZero(a)) return ZERO;
  const r = abs(a);
  const re = Math.sqrt((r + a.re) / 2);
  const im = Math.sqrt((r - a.re) / 2);
  return c(re, a.im < 0 ? -im : im);
}
export function pow(a: C, b: C): C {
  if (isZero(b)) return ONE;
  if (isZero(a)) {
    if (b.re < 0 || b.im !== 0 && b.re <= 0) throw new Error("0 raised to a negative or imaginary-real power is undefined");
    return ZERO;
  }
  if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 1024) {
    let n = Math.abs(b.re);
    let base = a;
    let result = ONE;
    while (n > 0) {
      if (n & 1) result = mul(result, base);
      base = mul(base, base);
      n = Math.floor(n / 2);
    }
    return b.re < 0 ? div(ONE, result) : result;
  }
  return exp(mul(b, ln(a)));
}
export const sin = (a: C) => c(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im));
export const cos = (a: C) => c(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im));
export function tan(a: C): C {
  const d = Math.cos(2 * a.re) + Math.cosh(2 * a.im);
  return c(Math.sin(2 * a.re) / d, Math.sinh(2 * a.im) / d);
}
export const sinh = (a: C) => c(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im));
export const cosh = (a: C) => c(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im));
export function tanh(a: C): C {
  const d = Math.cosh(2 * a.re) + Math.cos(2 * a.im);
  return c(Math.sinh(2 * a.re) / d, Math.sin(2 * a.im) / d);
}
export const asin = (a: C) => mul(c(0, -1), ln(add(mul(I, a), sqrt(sub(ONE, mul(a, a))))));
export const acos = (a: C) => sub(c(Math.PI / 2), asin(a));
export const atan = (a: C) => mul(c(0, 0.5), sub(ln(sub(ONE, mul(I, a))), ln(add(ONE, mul(I, a)))));
export const asinh = (a: C) => ln(add(a, sqrt(add(mul(a, a), ONE))));
export const acosh = (a: C) => ln(add(a, mul(sqrt(add(a, ONE)), sqrt(sub(a, ONE)))));
export const atanh = (a: C) => scale(sub(ln(add(ONE, a)), ln(sub(ONE, a))), 0.5);

/** All n-th roots of a. */
export function nthRoots(a: C, n: number): C[] {
  if (isZero(a)) return [ZERO];
  const r = Math.pow(abs(a), 1 / n);
  const th = arg(a);
  return Array.from({ length: n }, (_, k) => fromPolar(r, (th + 2 * Math.PI * k) / n));
}

// ---------------- expression parser ----------------
type Node =
  | { t: "num"; v: C }
  | { t: "var"; name: string }
  | { t: "bin"; op: string; a: Node; b: Node }
  | { t: "neg"; a: Node }
  | { t: "deg"; a: Node }
  | { t: "polar"; a: Node; b: Node }
  | { t: "call"; name: string; args: Node[] };

interface Tok {
  k: "num" | "id" | "op" | "(" | ")" | "," | "end";
  s: string;
  v?: C;
}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
    if (m) {
      i += m[0].length;
      const n = Number(m[0]);
      if (/^[ij](?![A-Za-z0-9_])/.test(src.slice(i))) {
        i++;
        out.push({ k: "num", s: m[0] + "i", v: c(0, n) });
      } else out.push({ k: "num", s: m[0], v: c(n) });
      continue;
    }
    const id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (id) {
      out.push({ k: "id", s: id[0] });
      i += id[0].length;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === ",") {
      out.push({ k: ch, s: ch });
      i++;
      continue;
    }
    if ("+-*/^×·÷∠@°".includes(ch) || (ch === "*" && src[i + 1] === "*")) {
      if (ch === "*" && src[i + 1] === "*") {
        out.push({ k: "op", s: "^" });
        i += 2;
        continue;
      }
      out.push({ k: "op", s: ch === "×" || ch === "·" ? "*" : ch === "÷" ? "/" : ch === "@" ? "∠" : ch });
      i++;
      continue;
    }
    throw new Error(`Unexpected "${ch}"`);
  }
  out.push({ k: "end", s: "" });
  return out;
}

class Parser {
  private p = 0;
  constructor(private toks: Tok[]) {}
  private peek(): Tok {
    return this.toks[this.p]!;
  }
  private next() {
    return this.toks[this.p++]!;
  }
  parse(): Node {
    const n = this.expr();
    if (this.peek().k !== "end") throw new Error(`Unexpected "${this.peek().s}"`);
    return n;
  }
  private expr(): Node {
    let a = this.term();
    while (this.peek().k === "op" && (this.peek().s === "+" || this.peek().s === "-")) {
      const op = this.next().s;
      a = { t: "bin", op, a, b: this.term() };
    }
    return a;
  }
  private startsOperand(): boolean {
    const k = this.peek().k;
    return k === "num" || k === "id" || k === "(";
  }
  private term(): Node {
    let a = this.unary();
    for (;;) {
      if (this.peek().k === "op" && (this.peek().s === "*" || this.peek().s === "/")) {
        const op = this.next().s;
        a = { t: "bin", op, a, b: this.unary() };
      } else if (this.peek().k === "op" && this.peek().s === "∠") {
        this.next();
        a = { t: "polar", a, b: this.unary() };
      } else if (this.startsOperand()) {
        a = { t: "bin", op: "*", a, b: this.unary() }; // implicit multiplication: 2(1+i), (1+i)(1-i), 2pi
      } else return a;
    }
  }
  private unary(): Node {
    if (this.peek().k === "op" && (this.peek().s === "-" || this.peek().s === "+")) {
      const op = this.next().s;
      const a = this.unary();
      return op === "-" ? { t: "neg", a } : a;
    }
    return this.power();
  }
  private power(): Node {
    const base = this.postfix();
    if (this.peek().k === "op" && this.peek().s === "^") {
      this.next();
      return { t: "bin", op: "^", a: base, b: this.unary() }; // right associative; -z^2 = -(z^2)
    }
    return base;
  }
  private postfix(): Node {
    let a = this.primary();
    while (this.peek().k === "op" && this.peek().s === "°") {
      this.next();
      a = { t: "deg", a };
    }
    return a;
  }
  private primary(): Node {
    const t = this.next();
    if (t.k === "num") return { t: "num", v: t.v! };
    if (t.k === "(") {
      const e = this.expr();
      if (this.next().k !== ")") throw new Error("Missing closing parenthesis");
      return e;
    }
    if (t.k === "id") {
      if (this.peek().k === "(") {
        this.next();
        const args: Node[] = [];
        if (this.peek().k !== ")") {
          args.push(this.expr());
          while (this.peek().k === ",") {
            this.next();
            args.push(this.expr());
          }
        }
        if (this.next().k !== ")") throw new Error("Missing closing parenthesis");
        return { t: "call", name: t.s.toLowerCase(), args };
      }
      return { t: "var", name: t.s };
    }
    throw new Error(t.k === "end" ? "Expression ends unexpectedly" : `Unexpected "${t.s}"`);
  }
}

const CONST: Record<string, C> = { i: I, j: I, pi: c(Math.PI), e: c(Math.E), tau: c(2 * Math.PI) };
const FN1: Record<string, (a: C) => C> = {
  sqrt, exp, ln, sin, cos, tan, sinh, cosh, tanh, asin, acos, atan, asinh, acosh, atanh, conj,
  log: ln,
  cbrt: (a) => pow(a, c(1 / 3)),
  recip: (a) => div(ONE, a),
  sq: (a) => mul(a, a),
  log10: (a) => scale(ln(a), 1 / Math.LN10),
  log2: (a) => scale(ln(a), 1 / Math.LN2),
  abs: (a) => c(abs(a)),
  mag: (a) => c(abs(a)),
  norm: (a) => c(a.re * a.re + a.im * a.im),
  arg: (a) => c(arg(a)),
  phase: (a) => c(arg(a)),
  re: (a) => c(a.re),
  real: (a) => c(a.re),
  im: (a) => c(a.im),
  imag: (a) => c(a.im),
  deg: (a) => scale(a, 180 / Math.PI),
  rad: (a) => scale(a, Math.PI / 180),
  sgn: (a) => (isZero(a) ? ZERO : scale(a, 1 / abs(a))),
};

interface Env {
  vars: Map<string, C>;
  angle: Opts["angleUnit"];
}

export function evalNode(n: Node, env: Env): C {
  switch (n.t) {
    case "num": return n.v;
    case "var": {
      const v = env.vars.get(n.name) ?? CONST[n.name.toLowerCase()];
      if (!v) throw new Error(`Unknown name "${n.name}"`);
      return v;
    }
    case "neg": return scale(evalNode(n.a, env), -1);
    case "deg": return scale(evalNode(n.a, env), Math.PI / 180);
    case "bin": {
      const a = evalNode(n.a, env);
      const b = evalNode(n.b, env);
      switch (n.op) {
        case "+": return add(a, b);
        case "-": return sub(a, b);
        case "*": return mul(a, b);
        case "/": return div(a, b);
        default: return pow(a, b);
      }
    }
    case "polar": {
      const r = evalNode(n.a, env);
      const th = evalNode(n.b, env);
      if (r.im !== 0 || th.im !== 0) throw new Error("Polar form r∠θ needs real r and θ");
      const rad = n.b.t === "deg" || env.angle === "rad" ? th.re : (th.re * Math.PI) / 180;
      return fromPolar(r.re, rad);
    }
    case "call": {
      const args = n.args.map((x) => evalNode(x, env));
      if (n.name === "polar") {
        if (args.length !== 2) throw new Error("polar(r, θ) takes two arguments");
        const rad = n.args[1]!.t === "deg" || env.angle === "rad" ? args[1]!.re : (args[1]!.re * Math.PI) / 180;
        return fromPolar(args[0]!.re, rad);
      }
      if (n.name === "root") {
        if (args.length !== 2) throw new Error("root(z, n) takes two arguments");
        return nthRoots(args[0]!, Math.round(args[1]!.re))[0]!;
      }
      if (n.name === "pow") {
        if (args.length !== 2) throw new Error("pow(z, w) takes two arguments");
        return pow(args[0]!, args[1]!);
      }
      if (n.name === "logb") {
        if (args.length !== 2) throw new Error("logb(z, base) takes two arguments");
        return div(ln(args[0]!), ln(args[1]!));
      }
      const f = FN1[n.name];
      if (!f) throw new Error(`Unknown function "${n.name}"`);
      if (args.length !== 1) throw new Error(`${n.name}() takes one argument`);
      return f(args[0]!);
    }
  }
}

export function evaluate(src: string, vars: Map<string, C> = new Map(), angle: Opts["angleUnit"] = "deg"): C {
  return evalNode(new Parser(lex(src)).parse(), { vars, angle });
}

// ---------------- formatting ----------------
function num(x: number, prec: number): string {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return "0";
  let s = Number(x.toPrecision(prec)).toString();
  if (/e/.test(s)) s = s.replace("e+", "e");
  return s;
}
/** Snap a component to zero when it is only floating-point noise next to the other one. */
function clean(a: C): C {
  const m = Math.max(Math.abs(a.re), Math.abs(a.im));
  const eps = 1e-12 * m;
  return c(Math.abs(a.re) < eps ? 0 : a.re, Math.abs(a.im) < eps ? 0 : a.im);
}
export function fmtRect(a: C, prec: number, unit: string): string {
  const z = clean(a);
  const re = num(z.re, prec);
  if (z.im === 0) return re;
  const imAbs = num(Math.abs(z.im), prec);
  const imStr = imAbs === "1" ? unit : imAbs + unit;
  if (z.re === 0) return (z.im < 0 ? "-" : "") + imStr;
  return `${re} ${z.im < 0 ? "-" : "+"} ${imStr}`;
}
export function fmtPolar(a: C, prec: number, angle: Opts["angleUnit"]): string {
  const z = clean(a);
  const r = abs(z);
  let th = arg(z);
  if (r === 0) return "0";
  if (angle === "deg") {
    th = (th * 180) / Math.PI;
    return `${num(r, prec)} ∠ ${num(Math.abs(th) < 1e-10 ? 0 : th, prec)}°`;
  }
  return `${num(r, prec)} ∠ ${num(th, prec)} rad`;
}
export function fmtExp(a: C, prec: number, unit: string): string {
  const z = clean(a);
  const r = abs(z);
  if (r === 0) return "0";
  const th = arg(z);
  const t = Math.abs(th) < 1e-12 ? 0 : th;
  return t === 0 ? num(r, prec) : `${num(r, prec)}·e^(${t < 0 ? "-" : ""}${unit}${num(Math.abs(t), prec)})`;
}

function show(a: C, o: Opts): string[] {
  const rect = fmtRect(a, o.precision, o.unit);
  const pol = fmtPolar(a, o.precision, o.angleUnit);
  const ex = fmtExp(a, o.precision, o.unit);
  switch (o.form) {
    case "rectangular": return [rect];
    case "polar": return [pol];
    case "exponential": return [ex];
    default: return [rect, `${pol}`, ex];
  }
}

// ---------------- polynomial roots (Durand–Kerner) ----------------
export function polyRoots(coeffs: C[]): { roots: C[]; residual: number } {
  const co = [...coeffs];
  while (co.length > 1 && isZero(co[0]!)) co.shift();
  const deg = co.length - 1;
  if (deg < 1) throw new Error("Need at least two coefficients (a degree of 1 or more)");
  const lead = co[0]!;
  const p = co.map((x) => div(x, lead)); // monic
  const evalP = (z: C) => p.reduce((acc, k) => add(mul(acc, z), k), ZERO);
  // Cauchy bound for the starting radius
  const R = 1 + Math.max(...p.slice(1).map(abs));
  let zs = Array.from({ length: deg }, (_, k) => fromPolar(Math.min(R, 1 + Math.max(...p.slice(1).map(abs))) * 0.5 + 0.1, (2 * Math.PI * k) / deg + 0.4));
  for (let it = 0; it < 2000; it++) {
    let delta = 0;
    zs = zs.map((z, i) => {
      let den = ONE;
      zs.forEach((w, j) => {
        if (i !== j) den = mul(den, sub(z, w));
      });
      if (isZero(den)) den = c(1e-12);
      const dz = div(evalP(z), den);
      delta = Math.max(delta, abs(dz));
      return sub(z, dz);
    });
    if (delta < 1e-15 * Math.max(1, R)) break;
  }
  // polish with a few Newton steps on the original polynomial
  const dP = p.slice(0, -1).map((k, i) => scale(k, deg - i));
  const evalD = (z: C) => dP.reduce((acc, k) => add(mul(acc, z), k), ZERO);
  zs = zs.map((z) => {
    let x = z;
    for (let k = 0; k < 4; k++) {
      const d = evalD(x);
      if (isZero(d)) break;
      x = sub(x, div(evalP(x), d));
    }
    return x;
  });
  zs.sort((a, b) => a.re - b.re || a.im - b.im);
  const residual = Math.max(...zs.map((z) => abs(evalP(z)) / Math.max(1, ...zs.map(abs).map((m) => Math.pow(m, deg)))));
  return { roots: zs, residual };
}

export function complexNumberCalculator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    mode: options.mode ?? "evaluate",
    form: options.form ?? "all",
    angleUnit: options.angleUnit ?? "deg",
    precision: options.precision ?? 8,
    n: options.n ?? 3,
    unit: options.unit ?? "i",
  };
  const lines = input.split(/\r?\n/).map((l) => l.replace(/#.*$/, "").replace(/\/\/.*$/, "").trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  try {
    if (o.mode === "nthroots") {
      const z = evaluate(lines[0]!, new Map(), o.angleUnit);
      const roots = nthRoots(z, o.n);
      const head = `${o.n} root${o.n === 1 ? "" : "s"} of ${fmtRect(z, o.precision, o.unit)}`;
      const w = String(roots.length - 1).length;
      return { output: [head, "", ...roots.map((r, k) => `k=${String(k).padStart(w)}  ${fmtRect(r, o.precision, o.unit).padEnd(26)} ${fmtPolar(r, o.precision, o.angleUnit)}`)].join("\n"), error: null };
    }
    if (o.mode === "polynomial") {
      const parts = lines.join(" ").split(/[\s,;]+/).filter(Boolean);
      const co = parts.map((p) => evaluate(p, new Map(), o.angleUnit));
      const { roots, residual } = polyRoots(co);
      const deg = roots.length;
      const poly = co.map((k, idx) => `(${fmtRect(k, o.precision, o.unit)})x^${co.length - 1 - idx}`).join(" + ");
      const out = [`Degree ${deg}: ${poly}`, "", ...roots.map((r, k) => `x${k + 1} = ${fmtRect(r, o.precision, o.unit).padEnd(28)} |x| = ${num(abs(r), o.precision)}`), "", `Largest scaled residual |p(x)|: ${residual.toExponential(2)}`];
      return { output: out.join("\n"), error: null };
    }
    const vars = new Map<string, C>();
    const out: string[] = [];
    let ans: C | null = null;
    for (const line of lines) {
      try {
        const asg = /^([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(line);
        let name: string | null = null;
        let src = line;
        if (asg) {
          name = asg[1]!;
          if (CONST[name.toLowerCase()] || name === "ans") throw new Error(`"${name}" is reserved`);
          src = asg[2]!;
        }
        if (ans) vars.set("ans", ans);
        const rootsCall = /^roots\((.+),\s*(\d+)\)$/i.exec(src);
        if (rootsCall && !name) {
          const z = evaluate(rootsCall[1]!, vars, o.angleUnit);
          const rs = nthRoots(z, Number(rootsCall[2]));
          out.push(`${line}\n${rs.map((r, k) => `  [${k}] ${fmtRect(r, o.precision, o.unit)}   ${fmtPolar(r, o.precision, o.angleUnit)}`).join("\n")}`);
          continue;
        }
        const v = evaluate(src, vars, o.angleUnit);
        ans = v;
        if (name) vars.set(name, v);
        const forms = show(v, o);
        out.push(`${name ? name + " = " + src + "\n" : line + "\n"}  = ${forms.join("\n  = ")}`);
      } catch (e) {
        if (lines.length === 1) throw e;
        out.push(`${line}\n  ! ${(e as Error).message}`);
      }
    }
    return { output: out.join("\n\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
