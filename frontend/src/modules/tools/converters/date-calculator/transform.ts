import type { TransformResult } from "@/lib/tool-transform";
import type { DateCalculatorOptions } from "./schema";

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function parseDate(text: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return null;
  const t = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  return iso(t) === text.trim() ? t : null; // rejects 2026-02-30
}

export function businessDays(from: number, to: number): number {
  const [a, b] = from <= to ? [from, to] : [to, from];
  let count = 0;
  for (let t = a; t < b; t += DAY) {
    const d = new Date(t).getUTCDay();
    if (d !== 0 && d !== 6) count++;
  }
  return count;
}

export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d.getUTCDate(), last));
}

function ymd(from: number, to: number): string {
  let months = (new Date(to).getUTCFullYear() - new Date(from).getUTCFullYear()) * 12 + new Date(to).getUTCMonth() - new Date(from).getUTCMonth();
  if (addMonths(from, months) > to) months--;
  const days = Math.round((to - addMonths(from, months)) / DAY);
  return `${Math.floor(months / 12)}y ${months % 12}m ${days}d`;
}

const weekday = (t: number) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date(t).getUTCDay()]!;

export function calcDates(input: string, options: DateCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const fail = (message: string): TransformResult => ({ output: "", error: { message, line: i + 1 } });
    const diff = /^(\S+)\s+(?:to|until|-|→)\s+(\S+)$/i.exec(line);
    const add = /^(\S+)\s*([+-])\s*(\d+)\s*(day|week|month|year|business day)s?$/i.exec(line);
    if (diff) {
      const a = parseDate(diff[1]!);
      const b = parseDate(diff[2]!);
      if (a === null || b === null) return fail("Use real dates in YYYY-MM-DD format.");
      const days = Math.round((b - a) / DAY);
      const [from, to] = a <= b ? [a, b] : [b, a];
      const inclusive = options.inclusive ? " (inclusive)" : "";
      out.push([line, `  ${Math.abs(days) + (options.inclusive ? 1 : 0)} days${inclusive}  ·  ${(Math.abs(days) / 7).toFixed(2)} weeks`, `  ${ymd(from, to)}`, `  ${businessDays(a, b) + (options.inclusive && new Date(Math.max(a, b)).getUTCDay() % 6 !== 0 ? 1 : 0)} business days (Mon–Fri, no holidays)`, days < 0 ? "  (end date is before start date)" : ""].filter(Boolean).join("\n"));
    } else if (add) {
      const start = parseDate(add[1]!);
      if (start === null) return fail("Use a real start date in YYYY-MM-DD format.");
      const n = Number(add[3]!) * (add[2] === "-" ? -1 : 1);
      const unit = add[4]!.toLowerCase();
      let result: number;
      if (unit === "day") result = start + n * DAY;
      else if (unit === "week") result = start + n * 7 * DAY;
      else if (unit === "month") result = addMonths(start, n);
      else if (unit === "year") result = addMonths(start, n * 12);
      else {
        result = start;
        let left = Math.abs(n);
        const step = n < 0 ? -DAY : DAY;
        while (left > 0) {
          result += step;
          const d = new Date(result).getUTCDay();
          if (d !== 0 && d !== 6) left--;
        }
      }
      out.push(`${line}  =  ${iso(result)} (${weekday(result)})`);
    } else {
      return fail('Try "2026-01-01 to 2026-12-25" or "2026-01-31 + 1 month" (units: day, week, month, year, business day).');
    }
  }
  return { output: out.join("\n\n"), error: null };
}
