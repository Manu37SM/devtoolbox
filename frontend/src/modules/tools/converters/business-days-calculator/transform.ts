import type { TransformResult } from "@/lib/tool-transform";
import type { BusinessDaysCalculatorOptions } from "./schema";

const DAY = 86400000;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKENDS: Record<BusinessDaysCalculatorOptions["weekend"], number[]> = {
  "sat-sun": [6, 0], "fri-sat": [5, 6], fri: [5], sat: [6], sun: [0], "thu-fri": [4, 5], none: [],
};

/** Days since 1970-01-01 for an ISO date, or null when the date is not real. */
export function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return null;
  return t / DAY;
}
export const fmtDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);
const weekday = (n: number) => (((n + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
const label = (n: number) => `${fmtDay(n)} ${WD[weekday(n)]}`;

export interface Calendar { weekend: number[]; holidays: Set<number> }
export const isBusiness = (n: number, c: Calendar) => !c.weekend.includes(weekday(n)) && !c.holidays.has(n);

/** Excel WORKDAY semantics: each step lands on the next business day; the start need not be one. */
export function addBusinessDays(start: number, n: number, c: Calendar): number {
  let d = start;
  const step = n < 0 ? -1 : 1;
  for (let left = Math.abs(n); left > 0; ) {
    d += step;
    if (isBusiness(d, c)) left--;
  }
  return d;
}
/** Business days in [a, b) like numpy.busday_count; for a > b it returns the negated count of [b+1, a+1), as numpy does. */
export function countBusinessDays(a: number, b: number, c: Calendar): number {
  if (a > b) return -countBusinessDays(b + 1, a + 1, c); // numpy convention for reversed ranges
  let k = 0;
  for (let d = a; d < b; d++) if (isBusiness(d, c)) k++;
  return k;
}

export function businessDaysCalculator(input: string, options: Partial<BusinessDaysCalculatorOptions>): TransformResult {
  const o: BusinessDaysCalculatorOptions = {
    mode: options.mode ?? "add", days: options.days ?? 5, weekend: options.weekend ?? "sat-sun", inclusiveEnd: options.inclusiveEnd ?? true, showSkipped: options.showSkipped ?? true,
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const dates: number[] = [];
  const holidays = new Set<number>();
  for (const [i, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const h = /^holidays?\b[:\s]*(.*)$/i.exec(line);
    if (h) {
      for (const part of h[1]!.split(/[,\s]+/).filter(Boolean)) {
        const [a, b] = part.split("..");
        const x = parseDay(a!);
        const y = b === undefined ? x : parseDay(b);
        if (x === null || y === null) return fail(`Line ${i + 1}: "${part}" is not a date (use YYYY-MM-DD or a range YYYY-MM-DD..YYYY-MM-DD).`);
        if (y < x) return fail(`Line ${i + 1}: range ${part} ends before it starts.`);
        if (y - x > 3660) return fail(`Line ${i + 1}: holiday range is longer than ten years.`);
        for (let d = x; d <= y; d++) holidays.add(d);
      }
      continue;
    }
    const d = parseDay(line);
    if (d === null) return fail(`Line ${i + 1}: "${line}" is not a date. Use YYYY-MM-DD, or "holiday YYYY-MM-DD" for holidays.`);
    dates.push(d);
  }
  if (dates.length === 0) return { output: "", error: null };
  const cal: Calendar = { weekend: WEEKENDS[o.weekend], holidays };
  const need = o.mode === "count" || o.mode === "list" ? 2 : 1;
  if (dates.length < need) return fail(`${o.mode === "count" ? "Counting" : "Listing"} needs a start date and an end date, one per line.`);
  const [a, b] = [dates[0]!, dates[1] ?? dates[0]!];
  const skippedBetween = (from: number, to: number) => {
    const out: string[] = [];
    for (let d = Math.min(from, to) + 1; d < Math.max(from, to); d++) {
      if (cal.weekend.includes(weekday(d))) out.push(`${label(d)} (weekend)`);
      else if (holidays.has(d)) out.push(`${label(d)} (holiday)`);
    }
    return out;
  };

  const L: string[] = [];
  if (o.mode === "add") {
    const r = addBusinessDays(a, o.days, cal);
    L.push(`${label(a)} ${o.days >= 0 ? "+" : "−"} ${Math.abs(o.days)} business day${Math.abs(o.days) === 1 ? "" : "s"} = ${label(r)}`);
    L.push(`Calendar days elapsed: ${Math.abs(r - a)}`);
    if (!isBusiness(a, cal)) L.push(`Note: the start date is not a business day; counting begins from the next one${o.days < 0 ? " before it" : ""}.`);
    if (o.showSkipped) {
      const sk = skippedBetween(a, r);
      if (sk.length) L.push("", `Skipped (${sk.length}):`, ...sk.map((s) => `  ${s}`));
    }
  } else if (o.mode === "count") {
    const n = countBusinessDays(Math.min(a, b), Math.max(a, b) + (o.inclusiveEnd ? 1 : 0), cal);
    L.push(`${label(a)} → ${label(b)}${o.inclusiveEnd ? " (both ends included)" : " (end excluded)"}`);
    L.push(`Business days: ${a <= b ? n : -n}`);
    L.push(`Calendar days: ${Math.abs(b - a) + (o.inclusiveEnd ? 1 : 0)}`);
    if (o.showSkipped) {
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const sk: string[] = [];
      for (let d = lo; d <= hi; d++) {
        if (!o.inclusiveEnd && d === (a <= b ? b : a)) continue;
        if (cal.weekend.includes(weekday(d))) sk.push(`${label(d)} (weekend)`);
        else if (holidays.has(d)) sk.push(`${label(d)} (holiday)`);
      }
      if (sk.length) L.push("", `Non-business days in range (${sk.length}):`, ...sk.map((s) => `  ${s}`));
    }
  } else if (o.mode === "list") {
    const lo = Math.min(a, b), hi = Math.max(a, b);
    if (hi - lo > 3660) return fail("List range is longer than ten years.");
    const days: string[] = [];
    for (let d = lo; d <= hi; d++) if (isBusiness(d, cal)) days.push(label(d));
    L.push(...days, "", `${days.length} business day${days.length === 1 ? "" : "s"} from ${fmtDay(lo)} to ${fmtDay(hi)}`);
  } else {
    const kind = cal.weekend.includes(weekday(a)) ? "weekend" : holidays.has(a) ? "holiday" : "business day";
    const next = addBusinessDays(a, 1, cal), prev = addBusinessDays(a, -1, cal);
    L.push(label(a), `Type: ${kind}`, `Next business day: ${label(next)}`, `Previous business day: ${label(prev)}`);
  }
  return { output: L.join("\n") + "\n", error: null };
}
