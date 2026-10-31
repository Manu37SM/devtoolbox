import type { TransformResult } from "@/lib/tool-transform";
import type { JulianDateConverterOptions } from "./schema";

type Opts = JulianDateConverterOptions;

const fdiv = (a: number, b: number) => Math.floor(a / b);
const mod = (a: number, b: number) => ((a % b) + b) % b;

export interface Ymd {
  y: number;
  m: number;
  d: number;
}

const isLeap = (y: number, cal: "g" | "j") => (cal === "j" ? mod(y, 4) === 0 : mod(y, 4) === 0 && (mod(y, 100) !== 0 || mod(y, 400) === 0));
export const daysInMonth = (y: number, m: number, cal: "g" | "j") => [31, isLeap(y, cal) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;

/** Julian Day Number (the integer JD at noon) of a calendar date; astronomical year numbering (year 0 = 1 BC). */
export function toJdn({ y, m, d }: Ymd, cal: "g" | "j"): number {
  const a = fdiv(14 - m, 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const base = d + fdiv(153 * mm + 2, 5) + 365 * yy + fdiv(yy, 4);
  return cal === "g" ? base - fdiv(yy, 100) + fdiv(yy, 400) - 32045 : base - 32083;
}

export function fromJdn(j: number, cal: "g" | "j"): Ymd {
  const f = cal === "g" ? j + 1401 + fdiv(fdiv(4 * j + 274277, 146097) * 3, 4) - 38 : j + 1401;
  const e = 4 * f + 3;
  const g = fdiv(mod(e, 1461), 4);
  const h = 5 * g + 2;
  const d = fdiv(mod(h, 153), 5) + 1;
  const m = mod(fdiv(h, 153) + 2, 12) + 1;
  const y = fdiv(e, 1461) - 4716 + fdiv(12 + 2 - m, 12);
  return { y, m, d };
}

export function validate({ y, m, d }: Ymd, cal: "g" | "j"): string | null {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return "date parts must be whole numbers";
  if (m < 1 || m > 12) return `month ${m} is out of range`;
  if (d < 1 || d > daysInMonth(y, m, cal)) return `${cal === "g" ? "Gregorian" : "Julian"} ${fmtYear(y)}-${String(m).padStart(2, "0")} has no day ${d}`;
  return null;
}

export const fmtYear = (y: number) => (y < 0 ? "-" : "") + String(Math.abs(y)).padStart(4, "0");
const pad2 = (n: number) => String(n).padStart(2, "0");
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const weekday = (jdn: number) => WD[mod(jdn + 1, 7)]!;

function dayOfYear(v: Ymd, cal: "g" | "j"): number {
  return toJdn(v, cal) - toJdn({ y: v.y, m: 1, d: 1 }, cal) + 1;
}
function fromOrdinal(y: number, ddd: number, cal: "g" | "j"): Ymd {
  const len = isLeap(y, cal) ? 366 : 365;
  if (ddd < 1 || ddd > len) throw new Error(`day-of-year ${ddd} is out of range for ${y} (1-${len})`);
  return fromJdn(toJdn({ y, m: 1, d: 1 }, cal) + ddd - 1, cal);
}

function fmtDate(v: Ymd, style: Opts["dateStyle"]): string {
  if (style === "dmy") return `${pad2(v.d)}/${pad2(v.m)}/${fmtYear(v.y)}`;
  if (style === "long") return `${v.d} ${MN[v.m - 1]} ${v.y > 0 ? v.y : `${1 - v.y} BC`}`;
  return `${fmtYear(v.y)}-${pad2(v.m)}-${pad2(v.d)}`;
}

const EXCEL1900_OFFSET = 2415019; // for dates on/after 1900-03-01 (Excel counts a non-existent 1900-02-29)
const EXCEL1904_OFFSET = 2416481;

export interface Parsed {
  jdn: number;
  /** fraction of a day after midnight UTC, when the input carried a time (JD / MJD) */
  frac: number;
  note?: string;
}

export function parseLine(line: string, fmt: Opts["inputFormat"], o: Opts): Parsed {
  let s = line.trim();
  let cal: "g" | "j" = "g";
  const prefix = /^(julian|gregorian|os|ns|j|g)\s*[:=]\s*/i.exec(s);
  if (prefix) {
    cal = /^(julian|os|j)/i.test(prefix[1]!) ? "j" : "g";
    s = s.slice(prefix[0].length);
    if (fmt === "auto") fmt = cal === "j" ? "julian-calendar" : "gregorian";
  }
  const labelled = /^(jd|mjd|lilian|rd|rata\s*die)\s*[:=]?\s*(-?\d+(?:\.\d+)?)$/i.exec(s);
  if (labelled && fmt === "auto") {
    const k = labelled[1]!.toLowerCase();
    fmt = k === "jd" ? "jd" : k === "mjd" ? "mjd" : k === "lilian" ? "lilian" : "rata-die";
    s = labelled[2]!;
  }
  const num = (): number => {
    const n = Number(s.replace(/[,_\s]/g, ""));
    if (!Number.isFinite(n)) throw new Error(`"${line}" is not a number`);
    return n;
  };
  const fromJd = (jd: number): Parsed => {
    const x = jd + 0.5;
    const jdn = Math.floor(x);
    return { jdn, frac: x - jdn };
  };

  if (fmt === "auto") {
    if (/^-?\d{1,6}-\d{1,2}-\d{1,2}$/.test(s) || /^\d{1,2}[/.]\d{1,2}[/.]\d{4}$/.test(s) || /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s)) fmt = "gregorian";
    else if (/^\d{4}-\d{3}$/.test(s)) fmt = "ordinal";
    else if (/^-?\d+\.\d+$/.test(s) || /^\d{9,}$/.test(s)) fmt = "jd";
    else if (/^\d{8}$/.test(s)) fmt = "yyyymmdd";
    else if (/^\d{7}$/.test(s)) {
      const yr = Number(s.slice(0, 4));
      const dd = Number(s.slice(4));
      fmt = yr >= 1000 && yr <= 2999 && dd >= 1 && dd <= 366 ? "ordinal" : "jd";
    } else if (/^\d{6}$/.test(s)) fmt = "cyyddd";
    else if (/^\d{5}$/.test(s)) fmt = "yyddd";
    else throw new Error(`Can't tell what "${line}" is; pick the input format`);
  }

  switch (fmt) {
    case "gregorian":
    case "julian-calendar":
    case "yyyymmdd": {
      const c: "g" | "j" = fmt === "julian-calendar" ? "j" : fmt === "yyyymmdd" ? "g" : prefix ? cal : "g";
      let m: RegExpExecArray | null;
      let v: Ymd;
      if ((m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})$/.exec(s)) || (m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s)) || (m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) v = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
      else if ((m = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(s))) v = { y: Number(m[3]), m: Number(m[2]), d: Number(m[1]) };
      else throw new Error(`"${line}" is not a date like 2024-05-03`);
      const bad = validate(v, c);
      if (bad) throw new Error(bad);
      return { jdn: toJdn(v, c), frac: 0 };
    }
    case "ordinal": {
      let m = /^(\d{4})-?(\d{3})$/.exec(s);
      if (!m) throw new Error(`"${line}" is not YYYY-DDD or YYYYDDD`);
      m = m!;
      return { jdn: toJdn(fromOrdinal(Number(m[1]), Number(m[2]), "g"), "g"), frac: 0 };
    }
    case "yyddd": {
      const m = /^(\d{2})(\d{3})$/.exec(s);
      if (!m) throw new Error(`"${line}" is not YYDDD (5 digits)`);
      const yy = Number(m[1]);
      const y = o.pivotStart + mod(yy - o.pivotStart, 100);
      return { jdn: toJdn(fromOrdinal(y, Number(m[2]), "g"), "g"), frac: 0, note: `two-digit year ${m[1]} read as ${y} (window ${o.pivotStart}-${o.pivotStart + 99})` };
    }
    case "cyyddd": {
      const m = /^(\d{1})(\d{2})(\d{3})$/.exec(s) ?? /^(\d{2,3})(\d{2})(\d{3})$/.exec(s);
      if (!m) throw new Error(`"${line}" is not CYYDDD (century digit, 2-digit year, day of year)`);
      const y = 1900 + Number(m[1]) * 100 + Number(m[2]);
      return { jdn: toJdn(fromOrdinal(y, Number(m[3]), "g"), "g"), frac: 0 };
    }
    case "jd":
      return fromJd(num());
    case "mjd":
      return fromJd(num() + 2400000.5);
    case "lilian":
      return { jdn: Math.floor(num()) + 2299160, frac: num() % 1 };
    case "rata-die":
      return { jdn: Math.floor(num()) + 1721425, frac: mod(num(), 1) };
    case "excel1900": {
      const n = Math.floor(num());
      if (n === 60) throw new Error("Excel serial 60 is the non-existent 1900-02-29 (a Lotus 1-2-3 compatibility bug)");
      if (n < 1) throw new Error("Excel 1900 serials start at 1 (1900-01-01)");
      return { jdn: n < 60 ? n + 2415020 : n + EXCEL1900_OFFSET, frac: mod(num(), 1) };
    }
    case "excel1904":
      return { jdn: Math.floor(num()) + EXCEL1904_OFFSET, frac: mod(num(), 1) };
  }
}

export function fromJdnAll(p: Parsed, o: Opts): Record<string, string> {
  const g = fromJdn(p.jdn, "g");
  const j = fromJdn(p.jdn, "j");
  const jd = p.jdn - 0.5 + p.frac;
  const yd = dayOfYear(g, "g");
  const out: Record<string, string> = {
    gregorian: fmtDate(g, o.dateStyle),
    "julian-calendar": fmtDate(j, o.dateStyle),
    weekday: weekday(p.jdn),
    ordinal: `${fmtYear(g.y)}-${String(yd).padStart(3, "0")}`,
    yyddd: g.y >= 0 ? `${pad2(mod(g.y, 100))}${String(yd).padStart(3, "0")}` : "n/a",
    cyyddd: g.y >= 1900 ? `${Math.floor((g.y - 1900) / 100)}${pad2(mod(g.y, 100))}${String(yd).padStart(3, "0")}` : "n/a (before 1900)",
    yyyyddd: `${String(Math.abs(g.y)).padStart(4, "0")}${String(yd).padStart(3, "0")}`,
    jd: trim(jd, 6),
    jdn: String(p.jdn),
    mjd: trim(jd - 2400000.5, 6),
    lilian: String(p.jdn - 2299160),
    "rata-die": String(p.jdn - 1721425),
    excel1900: p.jdn < 2415021 ? "n/a (before 1900-01-01)" : String(p.jdn < 2415080 ? p.jdn - 2415020 : p.jdn - EXCEL1900_OFFSET),
    excel1904: p.jdn < EXCEL1904_OFFSET ? "n/a (before 1904-01-01)" : String(p.jdn - EXCEL1904_OFFSET),
    unixDays: String(p.jdn - 2440588),
    shift: String(toJdn(g, "j") - toJdn(g, "g")),
  };
  if (p.frac > 0) {
    const secs = Math.round(p.frac * 86400);
    out.time = `${pad2(Math.floor(secs / 3600) % 24)}:${pad2(Math.floor(secs / 60) % 60)}:${pad2(secs % 60)} UTC`;
  }
  return out;
}

function trim(n: number, digits: number): string {
  return Number(n.toFixed(digits)).toString();
}

export function julianDateConverter(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    inputFormat: options.inputFormat ?? "auto",
    output: options.output ?? "table",
    pivotStart: options.pivotStart ?? 1970,
    dateStyle: options.dateStyle ?? "iso",
  };
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  const errs: string[] = [];
  for (const line of lines) {
    try {
      const p = parseLine(line, o.inputFormat, o);
      const a = fromJdnAll(p, o);
      if (o.output !== "table") {
        out.push(lines.length > 1 ? `${line}\t${a[o.output] ?? ""}` : (a[o.output] ?? ""));
        continue;
      }
      const rows: Array<[string, string]> = [
        ["Gregorian", `${a.gregorian}  (${a.weekday})`],
        ["Julian calendar", `${a["julian-calendar"]}   (Gregorian is ${a.shift} day${a.shift === "1" ? "" : "s"} ahead)`],
        ["Ordinal (ISO)", a.ordinal!],
        ["YYYYDDD", a.yyyyddd!],
        ["YYDDD", a.yyddd!],
        ["CYYDDD (JD Edwards)", a.cyyddd!],
        ["Julian Day (JD, from midnight)", a.jd!],
        ["Julian Day Number (noon)", a.jdn!],
        ["Modified JD", a.mjd!],
        ["Lilian", a.lilian!],
        ["Rata Die", a["rata-die"]!],
        ["Excel 1900 serial", a.excel1900!],
        ["Excel 1904 serial", a.excel1904!],
        ["Days since 1970-01-01", a.unixDays!],
      ];
      if (a.time) rows.splice(1, 0, ["Time", a.time]);
      const w = Math.max(...rows.map((r) => r[0].length));
      const head = lines.length > 1 ? [`# ${line}`] : [];
      const warn: string[] = [];
      if (p.note) warn.push(`note: ${p.note}`);
      if (p.jdn < 2299161) warn.push("Before the 1582 Gregorian reform: the Gregorian row is the proleptic calendar; historical records of that era used the Julian calendar (and countries switched between 1582 and 1923).");
      out.push([...head, ...rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`), ...warn.filter(Boolean).map((x) => `(${x})`)].join("\n"));
    } catch (e) {
      errs.push(`${line}: ${(e as Error).message}`);
      out.push(`${line}\t! ${(e as Error).message}`);
    }
  }
  if (errs.length && lines.length === 1) return { output: "", error: { message: errs[0]!.replace(/^[^:]*: /, "") } };
  return { output: out.join(o.output === "table" && lines.length > 1 ? "\n\n" : "\n"), error: null };
}
