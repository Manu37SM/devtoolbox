import type { TransformResult } from "@/lib/tool-transform";
import { formatCsv } from "@/lib/csv";
import type { WeekNumberCalculatorOptions } from "./schema";

const DAY = 86_400_000;
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const utc = (y: number, m: number, d: number) => {
  const t = new Date(0);
  t.setUTCFullYear(y, m - 1, d);
  t.setUTCHours(0, 0, 0, 0);
  return t.getTime();
};
const parts = (t: number) => {
  const d = new Date(t);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), wd: d.getUTCDay() };
};
const iso = (t: number) => {
  const p = parts(t);
  return `${String(p.y).padStart(4, "0")}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
};
export const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const dayOfYear = (t: number) => Math.round((t - utc(parts(t).y, 1, 1)) / DAY) + 1;

interface Rule {
  first: number;
  minDays: number;
  /** 0 = days before the first full week are "week 0" (strftime %U / %W). */
  zero?: boolean;
}
const RULES: Record<string, Rule> = {
  iso: { first: 1, minDays: 4 },
  us: { first: 0, minDays: 1 },
  "unix-sunday": { first: 0, minDays: 7, zero: true },
  "unix-monday": { first: 1, minDays: 7, zero: true },
};

/** The first day of week 1 of year y under the rule. */
function weekOneStart(y: number, r: Rule): number {
  const jan1 = utc(y, 1, 1);
  const offset = (parts(jan1).wd - r.first + 7) % 7; // days Jan 1 is past the start of its week
  const start = jan1 - offset * DAY;
  return 7 - offset >= r.minDays ? start : start + 7 * DAY;
}

export function weekOf(t: number, r: Rule): { year: number; week: number; start: number; end: number } {
  const y = parts(t).y;
  if (r.zero) {
    const first = weekOneStart(y, r);
    const week = t < first ? 0 : Math.floor((t - first) / (7 * DAY)) + 1;
    const start = t < first ? utc(y, 1, 1) : first + (week - 1) * 7 * DAY;
    const end = t < first ? first - DAY : Math.min(start + 6 * DAY, utc(y, 12, 31));
    return { year: y, week, start, end };
  }
  let wy = y;
  if (t < weekOneStart(y, r)) wy = y - 1;
  else if (t >= weekOneStart(y + 1, r)) wy = y + 1;
  const start1 = weekOneStart(wy, r);
  const week = Math.floor((t - start1) / (7 * DAY)) + 1;
  const start = start1 + (week - 1) * 7 * DAY;
  return { year: wy, week, start, end: start + 6 * DAY };
}

export function weeksInYear(y: number, r: Rule): number {
  if (r.zero) return weekOf(utc(y, 12, 31), r).week;
  return Math.round((weekOneStart(y + 1, r) - weekOneStart(y, r)) / (7 * DAY));
}

function parseDate(text: string): number | null {
  const m = /^(-?\d{1,6})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text) ?? /^(\d{4})(\d{2})(\d{2})$/.exec(text);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = utc(y, mo, d);
  const p = parts(t);
  return p.y === y && p.m === mo && p.d === d ? t : null;
}

export function calculateWeeks(input: string, options: Partial<WeekNumberCalculatorOptions>): TransformResult {
  const o: WeekNumberCalculatorOptions = {
    system: options.system ?? "iso",
    firstWeekday: options.firstWeekday ?? 1,
    minDays: options.minDays ?? 4,
    mode: options.mode ?? "dates",
    format: options.format ?? "text",
  };
  if (!input.trim()) return { output: "", error: null };
  const rule: Rule = o.system === "custom" ? { first: o.firstWeekday, minDays: o.minDays } : RULES[o.system]!;
  const label = (w: { year: number; week: number }) => (o.system === "iso" ? `${w.year}-W${String(w.week).padStart(2, "0")}` : `week ${w.week} of ${w.year}`);
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: Record<string, string | number | boolean>[] = [];

  for (const [idx, line] of lines.entries()) {
    const fail = (m: string): TransformResult => ({ output: "", error: { message: `Line ${idx + 1}: ${m}`, line: idx + 1 } });
    if (o.mode === "weeks") {
      const y = /^\d{1,6}$/.test(line) ? Number(line) : NaN;
      if (!Number.isInteger(y) || y < 1) return fail(`"${line}" is not a year. Enter a year such as 2026.`);
      const n = weeksInYear(y, rule);
      const first = rule.zero && weekOneStart(y, rule) > utc(y, 1, 1) ? 0 : 1;
      for (let w = first; w <= n; w++) {
        const probe = rule.zero ? (w === 0 ? utc(y, 1, 1) : weekOneStart(y, rule) + (w - 1) * 7 * DAY) : weekOneStart(y, rule) + (w - 1) * 7 * DAY;
        const info = weekOf(probe, rule);
        rows.push({ year: y, week: w, start: iso(info.start), end: iso(info.end) });
      }
      continue;
    }
    // ISO week text -> dates
    const wk = /^(\d{4})\s*-?\s*W(\d{1,2})(?:\s*-?\s*([1-7]))?$/i.exec(line);
    if (wk) {
      const [y, w, d] = [Number(wk[1]), Number(wk[2]), wk[3] ? Number(wk[3]) : 1];
      const iso8601 = RULES.iso!;
      if (w < 1 || w > weeksInYear(y, iso8601)) return fail(`${y} has ${weeksInYear(y, iso8601)} ISO weeks, so week ${w} does not exist.`);
      const start = weekOneStart(y, iso8601) + (w - 1) * 7 * DAY;
      rows.push({ input: line, weekStart: iso(start), weekEnd: iso(start + 6 * DAY), date: iso(start + (d - 1) * DAY), isoWeekday: d });
      continue;
    }
    const t = parseDate(line);
    if (t === null) return fail(`"${line}" is not a valid date. Use YYYY-MM-DD, or an ISO week such as 2026-W44.`);
    const p = parts(t);
    const w = weekOf(t, rule);
    const isoW = weekOf(t, RULES.iso!);
    const q = Math.floor((p.m - 1) / 3) + 1;
    rows.push({
      date: iso(t),
      weekday: WD[p.wd]!,
      week: label(w),
      weekStart: iso(w.start),
      weekEnd: iso(w.end),
      isoWeek: `${isoW.year}-W${String(isoW.week).padStart(2, "0")}-${p.wd === 0 ? 7 : p.wd}`,
      dayOfYear: dayOfYear(t),
      daysLeftInYear: (isLeap(p.y) ? 366 : 365) - dayOfYear(t),
      quarter: `Q${q}`,
      weeksInYear: weeksInYear(w.year, rule),
      leapYear: isLeap(p.y),
    });
  }

  if (o.format === "json") return { output: JSON.stringify(rows, null, 2), error: null };
  const keys = Object.keys(rows[0] ?? {});
  if (o.format === "csv") return { output: formatCsv([keys, ...rows.map((r) => keys.map((k) => String(r[k])))], ","), error: null };
  const text = rows.map((r) => {
    if ("input" in r) return `${r.input}: ${r.weekStart} – ${r.weekEnd}   (day ${r.isoWeekday} = ${r.date})`;
    if ("year" in r) return `Week ${String(r.week).padStart(2, " ")}: ${r.start} – ${r.end}`;
    return [
      `${r.date}  ${r.weekday}`,
      `  ${r.week}   (${r.weekStart} – ${r.weekEnd}; ${r.weeksInYear} weeks that year)`,
      `  ISO week ${r.isoWeek}   day ${r.dayOfYear} of the year (${r.daysLeftInYear} left)   ${r.quarter}${r.leapYear ? "   leap year" : ""}`,
    ].join("\n");
  });
  return { output: text.join(o.mode === "weeks" ? "\n" : "\n\n"), error: null };
}
