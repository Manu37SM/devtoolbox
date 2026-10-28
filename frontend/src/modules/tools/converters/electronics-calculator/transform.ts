import type { TransformResult } from "@/lib/tool-transform";
import type { ElectronicsCalculatorOptions } from "./schema";

const PREFIX: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9, R: 1 };

/** Parses 4.7k, 10u, 2.2M, 1R5 (=1.5), 4k7 (=4.7k), 1e-3. Units like V, A, ohm are ignored. */
export function parseSi(raw: string): number | null {
  const s = raw.trim().replace(/\s+/g, "").replace(/(ohms?|Ω|[VAFHWΩ]|Hz|s)$/i, (m) => (/^[Ss]$/.test(m) ? m : ""));
  const code = /^(\d+)([pnuµmkKMGR])(\d+)$/.exec(s);
  if (code) return Number(`${code[1]}.${code[3]}`) * PREFIX[code[2]!]!;
  const m = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([pnuµmkKMG])?$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * (m[2] ? PREFIX[m[2]]! : 1);
}

export function formatSi(v: number, unit: string, digits = 4): string {
  if (v === 0) return `0 ${unit}`;
  const steps: Array<[number, string]> = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  const a = Math.abs(v);
  const [f, p] = steps.find(([x]) => a >= x * 0.9995) ?? steps[steps.length - 1]!;
  return `${Number((v / f).toPrecision(digits))} ${p}${unit}`;
}

const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
export function nextE24(r: number): number {
  const dec = Math.floor(Math.log10(r));
  for (const d of [dec, dec + 1]) for (const m of E24) { const v = Number((m * 10 ** d).toPrecision(3)); if (v >= r * 0.9999) return v; }
  return r;
}

const COLORS: Record<string, { digit?: number; mult?: number; tol?: number }> = {
  black: { digit: 0, mult: 1 }, brown: { digit: 1, mult: 10, tol: 1 }, red: { digit: 2, mult: 100, tol: 2 }, orange: { digit: 3, mult: 1e3 },
  yellow: { digit: 4, mult: 1e4 }, green: { digit: 5, mult: 1e5, tol: 0.5 }, blue: { digit: 6, mult: 1e6, tol: 0.25 }, violet: { digit: 7, mult: 1e7, tol: 0.1 },
  grey: { digit: 8, mult: 1e8, tol: 0.05 }, gray: { digit: 8, mult: 1e8, tol: 0.05 }, white: { digit: 9, mult: 1e9 }, gold: { mult: 0.1, tol: 5 }, silver: { mult: 0.01, tol: 10 },
};

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

export function runElectronics(input: string, o: ElectronicsCalculatorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = fields(input);
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const num = (k: string): number | null | undefined => (f[k] === undefined || f[k] === "" ? undefined : parseSi(f[k]!));
  const need = (...ks: string[]): number[] | string => {
    const vals: number[] = [];
    for (const k of ks) {
      const v = num(k);
      if (v === undefined) return `Missing "${k}:" line`;
      if (v === null) return `Cannot read ${k}: "${f[k]}"`;
      vals.push(v);
    }
    return vals;
  };

  switch (o.operation) {
    case "ohms-law": {
      const keys = ["v", "i", "r", "p"] as const;
      const given: Partial<Record<(typeof keys)[number], number>> = {};
      for (const k of keys) { const v = num(k); if (v === null) return fail(`Cannot read ${k}: "${f[k]}"`); if (v !== undefined) given[k] = v; }
      if (Object.keys(given).length !== 2) return fail("Provide exactly two of v:, i:, r:, p:");
      let { v, i, r, p } = given;
      if (v !== undefined && i !== undefined) { r = v / i; p = v * i; }
      else if (v !== undefined && r !== undefined) { i = v / r; p = (v * v) / r; }
      else if (v !== undefined && p !== undefined) { i = p / v; r = (v * v) / p; }
      else if (i !== undefined && r !== undefined) { v = i * r; p = i * i * r; }
      else if (i !== undefined && p !== undefined) { v = p / i; r = p / (i * i); }
      else if (r !== undefined && p !== undefined) { v = Math.sqrt(p * r); i = Math.sqrt(p / r); }
      if (![v, i, r, p].every((x) => Number.isFinite(x))) return fail("Result is not finite (division by zero?)");
      return { output: [`Voltage     ${formatSi(v!, "V")}`, `Current     ${formatSi(i!, "A")}`, `Resistance  ${formatSi(r!, "Ω")}`, `Power       ${formatSi(p!, "W")}`].join("\n"), error: null };
    }
    case "led-resistor": {
      const n = need("vs", "vf", "i"); if (typeof n === "string") return fail(n);
      const [vs, vf, i] = n as [number, number, number];
      if (vs <= vf) return fail("Supply voltage must be higher than the LED forward voltage");
      if (i <= 0) return fail("Current must be positive");
      const r = (vs - vf) / i, std = nextE24(r);
      const iActual = (vs - vf) / std;
      return { output: [`Exact resistor    ${formatSi(r, "Ω")}`, `Next E24 value    ${formatSi(std, "Ω")} (actual current ${formatSi(iActual, "A")})`, `Resistor power    ${formatSi((vs - vf) * iActual, "W")} (use at least 2x this rating)`, `LED power         ${formatSi(vf * iActual, "W")}`].join("\n"), error: null };
    }
    case "voltage-divider": {
      const raw = { vin: num("vin"), r1: num("r1"), r2: num("r2"), vout: num("vout") };
      if (Object.values(raw).some((x) => x === null)) return fail("A value could not be read");
      const { vin, r1, r2, vout } = raw as Record<"vin" | "r1" | "r2" | "vout", number | undefined>;
      if (vin !== undefined && r1 !== undefined && r2 !== undefined) {
        const vo = (vin * r2) / (r1 + r2);
        return { output: `Vout  ${formatSi(vo, "V")}\nRatio ${Number((r2 / (r1 + r2)).toPrecision(5))}\nCurrent ${formatSi(vin / (r1 + r2), "A")}`, error: null };
      }
      if (vin !== undefined && vout !== undefined && r1 !== undefined) {
        if (vout <= 0 || vout >= vin) return fail("Vout must be between 0 and Vin");
        const r2v = (vout * r1) / (vin - vout);
        return { output: `R2  ${formatSi(r2v, "Ω")}\nNext E24 value  ${formatSi(nextE24(r2v), "Ω")}`, error: null };
      }
      if (vin !== undefined && vout !== undefined && r2 !== undefined) {
        if (vout <= 0 || vout >= vin) return fail("Vout must be between 0 and Vin");
        const r1v = (r2 * (vin - vout)) / vout;
        return { output: `R1  ${formatSi(r1v, "Ω")}\nNext E24 value  ${formatSi(nextE24(r1v), "Ω")}`, error: null };
      }
      return fail("Give vin, r1, r2 (finds vout), or vin, vout and one resistor (finds the other)");
    }
    case "series-parallel": {
      const toList = (s?: string) => (s ?? "").split(/[,\s]+/).filter(Boolean).map(parseSi);
      const series = toList(f.series ?? f.values), par = toList(f.parallel ?? f.values);
      const vals = series.length ? series : par;
      if (!vals.length) return fail("Add a values: line, e.g. values: 100, 220, 4.7k");
      if (vals.some((x) => x === null || x! <= 0)) return fail("Every value must be a positive number");
      const v = vals as number[];
      const s = v.reduce((a, b) => a + b, 0), p = 1 / v.reduce((a, b) => a + 1 / b, 0);
      return { output: `Series    ${formatSi(s, "Ω")}\nParallel  ${formatSi(p, "Ω")}`, error: null };
    }
    case "rc-filter": {
      const n = need("r", "c"); if (typeof n === "string") return fail(n);
      const [r, c] = n as [number, number];
      if (r <= 0 || c <= 0) return fail("R and C must be positive");
      const tau = r * c;
      return { output: [`Time constant (tau)   ${formatSi(tau, "s")}`, `Cutoff frequency      ${formatSi(1 / (2 * Math.PI * tau), "Hz")}`, `Charged to 99.3% (5 tau)  ${formatSi(5 * tau, "s")}`].join("\n"), error: null };
    }
    case "resistor-color-code": {
      const names = (f.bands ?? "").toLowerCase().split(/[,\s]+/).filter(Boolean);
      if (![4, 5].includes(names.length)) return fail("Give 4 or 5 colour bands, e.g. bands: brown black red gold");
      const bad = names.find((c) => !COLORS[c]);
      if (bad) return fail(`Unknown colour "${bad}"`);
      const digits = names.slice(0, names.length - 2).map((c) => COLORS[c]!.digit);
      if (digits.some((d) => d === undefined)) return fail("Digit bands must be black..white");
      const mult = COLORS[names[names.length - 2]!]!.mult, tol = COLORS[names[names.length - 1]!]!.tol;
      if (mult === undefined || tol === undefined) return fail("Last band must be a tolerance colour (brown, red, green, blue, violet, grey, gold, silver)");
      const val = Number(digits.join("")) * mult;
      return { output: `${formatSi(val, "Ω")} ±${tol}%\nRange ${formatSi(val * (1 - tol / 100), "Ω")} to ${formatSi(val * (1 + tol / 100), "Ω")}`, error: null };
    }
    case "timer-555-astable": {
      const n = need("r1", "r2", "c"); if (typeof n === "string") return fail(n);
      const [r1, r2, c] = n as [number, number, number];
      if (r1 <= 0 || r2 <= 0 || c <= 0) return fail("R1, R2 and C must be positive");
      const freq = 1.44 / ((r1 + 2 * r2) * c);
      return { output: [`Frequency  ${formatSi(freq, "Hz")}`, `Period     ${formatSi(1 / freq, "s")}`, `High time  ${formatSi(0.693 * (r1 + r2) * c, "s")}`, `Low time   ${formatSi(0.693 * r2 * c, "s")}`, `Duty cycle ${Number((((r1 + r2) / (r1 + 2 * r2)) * 100).toPrecision(4))}%`].join("\n"), error: null };
    }
  }
}
