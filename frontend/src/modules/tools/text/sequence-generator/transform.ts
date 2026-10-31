import type { TransformResult } from "@/lib/tool-transform";
import type { SequenceGeneratorOptions } from "./schema";

const MAX = 100_000;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 1 → a, 26 → z, 27 → aa (spreadsheet columns). */
export function letterAt(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    x--;
    s = String.fromCharCode(97 + (x % 26)) + s;
    x = Math.floor(x / 26);
  }
  return s;
}
export function letterIndex(s: string): number {
  let n = 0;
  for (const ch of s.toLowerCase()) n = n * 26 + (ch.charCodeAt(0) - 96);
  return n;
}

export function formatDate(d: Date, fmt: string): string {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate(), wd = d.getUTCDay();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const map: Record<string, string> = {
    yyyy: String(y).padStart(4, "0"), yy: p2(y % 100), MMMM: MONTHS[m]!, MMM: MONTHS[m]!.slice(0, 3), MM: p2(m + 1), M: String(m + 1),
    dd: p2(day), d: String(day), EEEE: DAYS[wd]!, EEE: DAYS[wd]!.slice(0, 3),
  };
  return fmt.replace(/yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|EEE|'[^']*'/g, (t) => (t.startsWith("'") ? t.slice(1, -1) || "'" : map[t]!));
}

function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? d : null;
}

/** start + k*step months, clamped to the end of shorter months (like dateutil's relativedelta). */
function addMonths(start: Date, months: number): Date {
  const total = start.getUTCFullYear() * 12 + start.getUTCMonth() + months;
  const y = Math.floor(total / 12), mo = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, mo, Math.min(start.getUTCDate(), last)));
}

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sequenceGenerator(_input: string, options: Partial<SequenceGeneratorOptions>): TransformResult {
  const o: SequenceGeneratorOptions = {
    kind: options.kind ?? "numbers", start: options.start ?? 1, end: options.end ?? 10, step: options.step ?? 1, count: options.count ?? 0,
    padWidth: options.padWidth ?? 0, decimals: options.decimals ?? 0, prefix: options.prefix ?? "", suffix: options.suffix ?? "",
    letterFrom: options.letterFrom ?? "a", letterCase: options.letterCase ?? "lower", startDate: options.startDate ?? "2026-01-01",
    dateStepUnit: options.dateStepUnit ?? "day", dateFormat: options.dateFormat ?? "yyyy-MM-dd", weekdaysOnly: options.weekdaysOnly ?? false,
    template: options.template ?? "item-{n:3}", reverse: options.reverse ?? false, shuffle: options.shuffle ?? false, seed: options.seed ?? 0,
    separator: options.separator ?? "newline", customSeparator: options.customSeparator ?? "", quote: options.quote ?? "none",
  };
  const err = (message: string): TransformResult => ({ output: "", error: { message } });
  let items: string[] = [];

  const numFmt = (n: number) => {
    const neg = n < 0;
    const body = Math.abs(n).toFixed(o.decimals);
    const [i, f] = body.split(".");
    const padded = o.decimals === 0 ? i!.padStart(o.padWidth, "0") : `${i!.padStart(o.padWidth, "0")}.${f}`;
    return (neg && Number(body) !== 0 ? "-" : "") + padded;
  };
  const numbers = (): number[] | string => {
    if (!Number.isFinite(o.start) || !Number.isFinite(o.step)) return "Start and step must be numbers.";
    if (o.step === 0) return "Step cannot be 0.";
    const out: number[] = [];
    const eps = Math.abs(o.step) * 1e-9;
    for (let i = 0; ; i++) {
      const v = o.start + i * o.step;
      if (o.count > 0 ? i >= o.count : o.step > 0 ? v > o.end + eps : v < o.end - eps) break;
      out.push(Math.round(v * 1e10) / 1e10);
      if (out.length > MAX) return `That would create more than ${MAX.toLocaleString()} items. Raise the step or lower the range.`;
    }
    return out;
  };

  if (o.kind === "numbers") {
    const n = numbers();
    if (typeof n === "string") return err(n);
    items = n.map(numFmt);
  } else if (o.kind === "letters") {
    const from = letterIndex(o.letterFrom.replace(/[^A-Za-z]/g, "") || "a");
    const step = Math.max(1, Math.round(Math.abs(o.step)) || 1);
    // Without a count, "End" is a position in the alphabet (1 = a, 26 = z, 27 = aa).
    const total = o.count > 0 ? o.count : Math.max(0, Math.floor((Math.floor(o.end) - from) / step) + 1);
    if (total > MAX) return err(`That would create more than ${MAX.toLocaleString()} items.`);
    for (let i = 0; i < total; i++) {
      const s = letterAt(from + i * step);
      items.push(o.letterCase === "upper" ? s.toUpperCase() : s);
    }
  } else if (o.kind === "dates") {
    const start = parseDate(o.startDate);
    if (!start) return err("Enter the start date as YYYY-MM-DD, for example 2026-01-31.");
    const n = o.count > 0 ? o.count : Math.max(1, Math.floor(o.end));
    if (n > 5000) return err("Dates are limited to 5,000 items.");
    const stepN = Math.max(1, Math.round(Math.abs(o.step)) || 1);
    for (let k = 0; items.length < n && k < 100000; k++) {
      let d: Date;
      const i = k * stepN;
      if (o.dateStepUnit === "day") d = new Date(start.getTime() + i * 86_400_000);
      else if (o.dateStepUnit === "week") d = new Date(start.getTime() + i * 7 * 86_400_000);
      else if (o.dateStepUnit === "month") d = addMonths(start, i);
      else if (o.dateStepUnit === "quarter") d = addMonths(start, i * 3);
      else d = addMonths(start, i * 12);
      if (o.weekdaysOnly && (d.getUTCDay() === 0 || d.getUTCDay() === 6)) continue;
      items.push(formatDate(d, o.dateFormat));
    }
  } else {
    const n = numbers();
    if (typeof n === "string") return err(n);
    if (!/\{[nNaA](:\d+)?\}/.test(o.template)) return err("The template needs a placeholder: {n} for the number, {n:3} for zero-padded, {a} for a letter or {A} for an upper-case letter.");
    items = n.map((v, i) =>
      o.template.replace(/\{([nNaA])(?::(\d+))?\}/g, (_m, t: string, w?: string) => {
        if (t === "n" || t === "N") return (o.decimals ? v.toFixed(o.decimals) : String(Math.trunc(v))).padStart(Number(w ?? o.padWidth), "0");
        const s = letterAt(Math.max(1, Math.trunc(v)) || i + 1);
        return t === "A" ? s.toUpperCase() : s;
      }),
    );
  }

  if (o.reverse) items.reverse();
  if (o.shuffle) {
    const rnd = o.seed ? mulberry32(o.seed) : () => crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
  }
  const q = o.quote === "single" ? "'" : o.quote === "double" ? '"' : "";
  const sepMap = { newline: "\n", comma: ",", "comma-space": ", ", space: " ", tab: "\t", semicolon: ";", pipe: "|" } as const;
  const sep = o.separator === "custom" ? o.customSeparator : sepMap[o.separator];
  const wrap = o.kind === "template" ? (s: string) => s : (s: string) => `${o.prefix}${s}${o.suffix}`;
  return { output: items.map((s) => `${q}${wrap(s)}${q}`).join(sep), error: null };
}
