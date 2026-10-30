/**
 * Cron parsing and next-run calculation for three dialects:
 *   unix   - 5 fields: minute hour day-of-month month day-of-week (crontab, Kubernetes CronJob, GitHub Actions)
 *   spring - 6 fields: second minute hour day-of-month month day-of-week (@Scheduled, CronExpression)
 *   quartz - 6 or 7 fields: second ... day-of-week [year]; one of the day fields must be "?"
 * Next runs are computed in a chosen IANA time zone, so DST changes are handled.
 */

export type CronDialect = "unix" | "spring" | "quartz";

export interface CronParseResult {
  valid: boolean;
  error: string | null;
  description: string | null;
  /** UTC instants, ISO 8601. */
  nextRuns: string[];
  /** The same instants as wall-clock times in the chosen zone, e.g. "Mon 2026-11-02 09:00:00 GMT+05:30". */
  nextRunsLocal: string[];
}

export interface CronOptions {
  dialect?: CronDialect;
  nextRunCount?: number;
  /** IANA zone such as "Asia/Kolkata"; default UTC. */
  timezone?: string;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MACROS: Record<string, [string, string]> = {
  // [unix, spring]
  "@yearly": ["0 0 1 1 *", "0 0 0 1 1 *"],
  "@annually": ["0 0 1 1 *", "0 0 0 1 1 *"],
  "@monthly": ["0 0 1 * *", "0 0 0 1 * *"],
  "@weekly": ["0 0 * * 0", "0 0 0 * * 0"],
  "@daily": ["0 0 * * *", "0 0 0 * * *"],
  "@midnight": ["0 0 * * *", "0 0 0 * * *"],
  "@hourly": ["0 * * * *", "0 0 * * * *"],
};

class CronError extends Error {}

interface DomSpec {
  any: boolean;
  values: Set<number>;
  /** L or L-n: day = last day - n. */
  lastOffsets: number[];
  /** nW: nearest weekday to n. */
  nearestWeekday: number[];
  lastWeekday: boolean;
}

interface DowSpec {
  any: boolean;
  /** 0 = Sunday. */
  values: Set<number>;
  /** dL: last given weekday of the month. */
  lastOf: Set<number>;
  /** d#n: nth given weekday of the month. */
  nth: Array<[number, number]>;
}

interface Parsed {
  seconds: number[];
  minutes: number[];
  hours: number[];
  dom: DomSpec;
  months: Set<number>;
  dow: DowSpec;
  years: Set<number> | null;
  combineDays: "and" | "or";
  fields: string[];
}

function replaceNames(text: string, names: string[], first: number): string {
  return text.toUpperCase().replace(/[A-Z]{3}/g, (n) => {
    const i = names.indexOf(n);
    if (i < 0) throw new CronError(`Unknown name "${n}"`);
    return String(i + first);
  });
}

// Parses lists such as "a,b-c", "*", every-n steps and "n/step" into sorted values within [min, max].
function parseList(field: string, min: number, max: number): number[] {
  const values = new Set<number>();
  for (const part of field.split(",")) {
    const m = /^(\*|\?|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part);
    if (!m) throw new CronError(`Unrecognised syntax "${part}"`);
    const step = m[2] ? Number(m[2]) : 1;
    if (step <= 0) throw new CronError("Step must be a positive integer");
    let lo = min;
    let hi = max;
    if (m[1] !== "*" && m[1] !== "?") {
      const r = /^(\d+)(?:-(\d+))?$/.exec(m[1]!)!;
      lo = Number(r[1]);
      // "n/step" means from n to the end of the range (Quartz and Spring style).
      hi = r[2] !== undefined ? Number(r[2]) : m[2] ? max : lo;
    }
    if (lo < min || hi > max) throw new CronError(`Value out of range (${min}-${max})`);
    if (lo > hi) throw new CronError(`Range ${lo}-${hi} runs backwards`);
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return [...values].sort((a, b) => a - b);
}

function parseDom(field: string): DomSpec {
  const spec: DomSpec = { any: false, values: new Set(), lastOffsets: [], nearestWeekday: [], lastWeekday: false };
  if (field === "*" || field === "?") return { ...spec, any: true };
  for (const part of field.toUpperCase().split(",")) {
    if (part === "L") spec.lastOffsets.push(0);
    else if (/^L-\d+$/.test(part)) spec.lastOffsets.push(Number(part.slice(2)));
    else if (part === "LW") spec.lastWeekday = true;
    else if (/^\d+W$/.test(part)) {
      const n = Number(part.slice(0, -1));
      if (n < 1 || n > 31) throw new CronError("Value out of range (1-31)");
      spec.nearestWeekday.push(n);
    } else for (const v of parseList(part, 1, 31)) spec.values.add(v);
  }
  return spec;
}

function parseDow(field: string, dialect: CronDialect): DowSpec {
  const spec: DowSpec = { any: false, values: new Set(), lastOf: new Set(), nth: [] };
  if (field === "*" || field === "?") return { ...spec, any: true };
  const quartz = dialect === "quartz";
  const toNum = (s: string) => Number(replaceNames(s, DAYS, quartz ? 1 : 0));
  const norm = (v: number) => (quartz ? v - 1 : v % 7);
  for (const part of field.toUpperCase().split(",")) {
    if (part === "L") spec.values.add(quartz ? 6 : 0);
    else if (/^([A-Z]{3}|\d)L$/.test(part)) spec.lastOf.add(norm(toNum(part.slice(0, -1))));
    else if (/^([A-Z]{3}|\d)#\d$/.test(part)) {
      const [d, n] = part.split("#");
      if (Number(n) < 1 || Number(n) > 5) throw new CronError("The # occurrence must be 1-5");
      spec.nth.push([norm(toNum(d!)), Number(n)]);
    } else {
      const numeric = replaceNames(part, DAYS, quartz ? 1 : 0);
      for (const v of parseList(numeric, quartz ? 1 : 0, quartz ? 7 : 7)) spec.values.add(norm(v));
    }
  }
  return spec;
}

function restricted(field: string): boolean {
  return field !== "*" && field !== "?";
}

export function parseExpression(expression: string, dialect: CronDialect): Parsed {
  let text = expression.trim().replace(/\s+/g, " ");
  const macro = MACROS[text.toLowerCase()];
  if (macro) {
    if (dialect === "quartz") throw new CronError("Quartz does not support @macros");
    text = macro[dialect === "unix" ? 0 : 1];
  }
  const fields = text.split(" ");
  const expected = dialect === "unix" ? "5" : dialect === "spring" ? "6" : "6 or 7";
  const ok = dialect === "unix" ? fields.length === 5 : dialect === "spring" ? fields.length === 6 : fields.length === 6 || fields.length === 7;
  if (!ok) {
    const hint =
      dialect !== "unix" && fields.length === 5
        ? " Spring and Quartz expressions start with a seconds field, e.g. 0 " + text
        : dialect === "unix" && fields.length === 6
          ? " Six fields look like a Spring/Quartz expression with seconds; switch the dialect."
          : "";
    throw new CronError(`Expected ${expected} fields, got ${fields.length}.${hint}`);
  }
  const all = dialect === "unix" ? ["0", ...fields] : fields;
  const [sec, min, hour, dom, month, dow, year] = all as [string, string, string, string, string, string, string?];
  const at = (name: string, fn: () => number[]) => {
    try {
      return fn();
    } catch (e) {
      throw new CronError(`Invalid ${name} field: ${e instanceof Error ? e.message : "parse error"}`);
    }
  };
  const wrap = <T>(name: string, fn: () => T): T => {
    try {
      return fn();
    } catch (e) {
      throw new CronError(`Invalid ${name} field "${name === "day-of-month" ? dom : dow}": ${e instanceof Error ? e.message : "parse error"}`);
    }
  };
  if (dialect === "quartz" && dom !== "?" && dow !== "?") {
    throw new CronError('Quartz needs "?" in either the day-of-month or the day-of-week field (e.g. 0 15 10 ? * 6L).');
  }
  if (dialect === "quartz" && dom === "?" && dow === "?") {
    throw new CronError('Only one of the day-of-month and day-of-week fields can be "?".');
  }
  if (dialect === "unix" && (dom === "?" || dow === "?")) throw new CronError('"?" is Spring/Quartz syntax; use "*" in crontab.');
  return {
    seconds: at("second", () => parseList(sec, 0, 59)),
    minutes: at("minute", () => parseList(min, 0, 59)),
    hours: at("hour", () => parseList(hour, 0, 23)),
    dom: wrap("day-of-month", () => parseDom(dom)),
    months: new Set(at("month", () => parseList(replaceNames(month, MONTHS, 1), 1, 12))),
    dow: wrap("day-of-week", () => parseDow(dow, dialect)),
    years: year && restricted(year) ? new Set(at("year", () => parseList(year, 1970, 2199))) : null,
    // Vixie cron: when both day fields are restricted, a day matching either one fires. Spring/Quartz require both.
    combineDays: dialect === "unix" && restricted(dom) && restricted(dow) ? "or" : "and",
    fields: all,
  };
}

// ---------------------------------------------------------------- calendar helpers

const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const weekday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

function nearestWeekday(y: number, m: number, n: number): number {
  const last = daysInMonth(y, m);
  const day = Math.min(n, last);
  const wd = weekday(y, m, day);
  if (wd === 6) return day === 1 ? 3 : day - 1; // Saturday -> Friday, but never into the previous month
  if (wd === 0) return day === last ? day - 2 : day + 1; // Sunday -> Monday, but never into the next month
  return day;
}

function domMatches(spec: DomSpec, y: number, m: number, d: number): boolean {
  if (spec.any) return true;
  if (spec.values.has(d)) return true;
  const last = daysInMonth(y, m);
  if (spec.lastOffsets.some((off) => d === last - off)) return true;
  if (spec.nearestWeekday.some((n) => nearestWeekday(y, m, n) === d)) return true;
  if (spec.lastWeekday) {
    const wd = weekday(y, m, last);
    const lw = wd === 6 ? last - 1 : wd === 0 ? last - 2 : last;
    if (d === lw) return true;
  }
  return false;
}

function dowMatches(spec: DowSpec, y: number, m: number, d: number): boolean {
  if (spec.any) return true;
  const wd = weekday(y, m, d);
  if (spec.values.has(wd)) return true;
  if (spec.lastOf.has(wd) && d + 7 > daysInMonth(y, m)) return true;
  return spec.nth.some(([day, n]) => day === wd && Math.ceil(d / 7) === n);
}

// ---------------------------------------------------------------- time zone helpers

const formatters = new Map<string, Intl.DateTimeFormat>();
function zoneFormatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(zone, f);
  }
  return f;
}

function wallClock(zone: string, instant: number): [number, number, number, number, number, number] {
  const parts = Object.fromEntries(zoneFormatter(zone).formatToParts(new Date(instant)).map((p) => [p.type, p.value]));
  return [Number(parts.year), Number(parts.month), Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second)];
}

function offsetMs(zone: string, instant: number): number {
  const [y, mo, d, h, mi, s] = wallClock(zone, instant);
  return Date.UTC(y, mo - 1, d, h, mi, s) - (instant - (instant % 1000 + 1000) % 1000);
}

export function isValidTimeZone(zone: string): boolean {
  try {
    zoneFormatter(zone);
    return true;
  } catch {
    return false;
  }
}

function computeNextRuns(p: Parsed, count: number, from: Date, zone: string): number[] {
  const out: number[] = [];
  const start = from.getTime();
  const [y0, m0, d0] = wallClock(zone, start);
  let day = Date.UTC(y0, m0 - 1, d0);
  const limit = day + 5 * 366 * 86_400_000;
  for (; day <= limit && out.length < count; day += 86_400_000) {
    const date = new Date(day);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    if (p.years && !p.years.has(y)) continue;
    if (!p.months.has(m)) continue;
    const domOk = domMatches(p.dom, y, m, d);
    const dowOk = dowMatches(p.dow, y, m, d);
    if (p.combineDays === "or" ? !(domOk || dowOk) : !(domOk && dowOk)) continue;
    // The UTC offset can change during the day (DST); check both ends and verify each candidate.
    const offStart = offsetMs(zone, day - 14 * 3_600_000);
    const offEnd = offsetMs(zone, day + 38 * 3_600_000);
    for (const h of p.hours) {
      for (const mi of p.minutes) {
        for (const s of p.seconds) {
          const wall = day + ((h * 60 + mi) * 60 + s) * 1000;
          // On a DST change day, wall times inside the gap do not exist (skipped) and repeated ones fire once.
          const instant =
            offStart === offEnd
              ? wall - offStart
              : [wall - offStart, wall - offEnd].sort((a, b) => a - b).find((t) => wall - offsetMs(zone, t) === t);
          if (instant === undefined || instant <= start) continue;
          if (out[out.length - 1] !== instant) out.push(instant);
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

function formatLocal(zone: string, instant: number): string {
  const [y, mo, d, h, mi, s] = wallClock(zone, instant);
  const off = Math.round(offsetMs(zone, instant) / 60000);
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  const p2 = (n: number) => String(n).padStart(2, "0");
  const wd = DAYS[weekday(y, mo, d)]!;
  return `${wd.charAt(0)}${wd.slice(1).toLowerCase()} ${y}-${p2(mo)}-${p2(d)} ${p2(h)}:${p2(mi)}:${p2(s)} GMT${sign}${p2(Math.floor(abs / 60))}:${p2(abs % 60)}`;
}

// ---------------------------------------------------------------- description

function listText(values: string[]): string {
  return values.length <= 1 ? (values[0] ?? "") : `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function fieldPhrase(field: string, unit: string, plural: string): string | null {
  if (field === "*" || field === "?") return null;
  const step = /^(\*|0)\/(\d+)$/.exec(field);
  if (step) return `every ${step[2]} ${plural}`;
  const range = /^(\d+)-(\d+)$/.exec(field);
  if (range) return `${unit}s ${range[1]} through ${range[2]}`;
  return `${field.includes(",") ? unit + "s" : unit} ${listText(field.split(","))}`;
}

export function describe(p: Parsed): string {
  const [sec, min, hour, dom, month, dow] = p.fields as [string, string, string, string, string, string];
  const single = (f: string) => /^\d+$/.test(f);
  const p2 = (v: string) => v.padStart(2, "0");
  const parts: string[] = [];
  if (single(hour) && single(min) && single(sec)) {
    parts.push(`At ${p2(hour)}:${p2(min)}${sec !== "0" ? `:${p2(sec)}` : ""}`);
  } else {
    const s = fieldPhrase(sec, "second", "seconds");
    const m = fieldPhrase(min, "minute", "minutes");
    const h = fieldPhrase(hour, "hour", "hours");
    if (s && sec !== "0") parts.push(s === `second ${sec}` ? `at second ${sec}` : s);
    if (!m && !h && (sec === "0" || !s)) parts.push("every minute");
    else if (m) parts.push(m.startsWith("every") ? m : `at ${m}`);
    if (h) parts.push(h.startsWith("every") ? h : `during ${h}`);
    else if (m && single(min)) parts.push("past every hour");
    parts[0] = parts[0]!.charAt(0).toUpperCase() + parts[0]!.slice(1);
  }
  const days: string[] = [];
  const domText = (() => {
    if (!restricted(dom)) return null;
    const u = dom.toUpperCase();
    if (u === "L") return "on the last day of the month";
    if (/^L-\d+$/.test(u)) return `on the ${u.slice(2)}${ordinalSuffix(Number(u.slice(2)))}-to-last day of the month`;
    if (u === "LW") return "on the last weekday of the month";
    if (/^\d+W$/.test(u)) return u === "1W" ? "on the first weekday of the month" : `on the weekday nearest day ${u.slice(0, -1)}`;
    return `on day ${listText(u.split(","))} of the month`;
  })();
  const dowText = (() => {
    if (!restricted(dow)) return null;
    const names = [...p.dow.values].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_NAMES[d]!);
    const ranges = /^(MON|1)-(FRI|5)$/i.test(dow) ? ["Monday through Friday"] : names;
    const extra = [
      ...[...p.dow.lastOf].map((d) => `the last ${DAY_NAMES[d]} of the month`),
      ...p.dow.nth.map(([d, n]) => `the ${n}${ordinalSuffix(n)} ${DAY_NAMES[d]} of the month`),
    ];
    const all = [...ranges, ...extra];
    return all.length ? `on ${listText(all)}` : null;
  })();
  if (domText) days.push(domText);
  if (dowText) days.push(dowText);
  if (days.length) parts.push(days.join(p.combineDays === "or" ? " or " : " and "));
  if (restricted(month)) {
    const ms = [...p.months].sort((a, b) => a - b).map((m) => MONTH_NAMES[m - 1]!);
    parts.push(`in ${listText(ms)}`);
  }
  if (p.years) parts.push(`in ${listText([...p.years].map(String))}`);
  return parts.join(", ").replace(/, (in |on |and )/g, " $1");
}

function ordinalSuffix(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/**
 * `options` may be a number for the next-run count (the original signature).
 */
export function parseCron(expression: string, options: CronOptions | number = {}, from: Date = new Date()): CronParseResult {
  const o: CronOptions = typeof options === "number" ? { nextRunCount: options } : options;
  const dialect = o.dialect ?? "unix";
  const zone = o.timezone?.trim() || "UTC";
  const empty = { valid: false, description: null, nextRuns: [], nextRunsLocal: [] };
  if (expression.trim().length === 0) return { ...empty, error: null };
  if (!isValidTimeZone(zone)) return { ...empty, error: `Unknown time zone "${zone}". Use an IANA name such as Asia/Kolkata or Europe/London.` };
  try {
    const parsed = parseExpression(expression, dialect);
    const runs = computeNextRuns(parsed, o.nextRunCount ?? 5, from, zone);
    return {
      valid: true,
      error: null,
      description: describe(parsed),
      nextRuns: runs.map((t) => new Date(t).toISOString()),
      nextRunsLocal: runs.map((t) => formatLocal(zone, t)),
    };
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : "Invalid cron expression" };
  }
}
