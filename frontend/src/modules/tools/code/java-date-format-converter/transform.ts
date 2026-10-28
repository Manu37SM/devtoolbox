import type { TransformResult } from "@/lib/tool-transform";
import type { JavaDateFormatConverterOptions } from "./schema";

export type Unit =
  | "Y4" | "Y2" | "MON2" | "MON1" | "MONS" | "MONL" | "D2" | "D1" | "DOY3"
  | "H24_2" | "H24_1" | "H12_2" | "H12_1" | "MIN2" | "SEC2" | "AMPM" | "DOWS" | "DOWL"
  | "TZOFF" | "TZOFFC" | "TZNAME";
export type Token = { k: "lit"; v: string } | { k: "unit"; u: Unit } | { k: "frac"; n: number };
export type Dialect = JavaDateFormatConverterOptions["from"];

class PatternError extends Error {}
const unit = (u: Unit): Token => ({ k: "unit", u });
const lit = (v: string): Token => ({ k: "lit", v });

/* ───────────── parsers ───────────── */

export function parseJava(p: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < p.length; ) {
    const c = p[i]!;
    if (c === "'") {
      if (p[i + 1] === "'") { out.push(lit("'")); i += 2; continue; }
      let j = i + 1, s = "";
      while (j < p.length) {
        if (p[j] === "'") { if (p[j + 1] === "'") { s += "'"; j += 2; continue; } break; }
        s += p[j++];
      }
      if (j >= p.length) throw new PatternError("Unterminated quote (') in Java pattern.");
      out.push(lit(s)); i = j + 1; continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let n = 1;
      while (p[i + n] === c) n++;
      i += n;
      switch (c) {
        case "y": case "u": out.push(unit(n === 2 ? "Y2" : "Y4")); break;
        case "M": case "L": out.push(unit(n === 1 ? "MON1" : n === 2 ? "MON2" : n === 3 ? "MONS" : "MONL")); break;
        case "d": out.push(unit(n === 1 ? "D1" : "D2")); break;
        case "D": out.push(unit("DOY3")); break;
        case "H": out.push(unit(n === 1 ? "H24_1" : "H24_2")); break;
        case "h": out.push(unit(n === 1 ? "H12_1" : "H12_2")); break;
        case "m": out.push(unit("MIN2")); break;
        case "s": out.push(unit("SEC2")); break;
        case "S": out.push({ k: "frac", n: Math.min(n, 9) }); break;
        case "a": out.push(unit("AMPM")); break;
        case "E": out.push(unit(n <= 3 ? "DOWS" : "DOWL")); break;
        case "Z": out.push(unit("TZOFF")); break;
        case "X": case "x": out.push(unit(n >= 3 ? "TZOFFC" : "TZOFF")); break;
        case "z": out.push(unit("TZNAME")); break;
        default: throw new PatternError(`Unsupported Java pattern letter "${c}" (supported: y u M L d D H h m s S a E Z X x z).`);
      }
      continue;
    }
    out.push(lit(c)); i++;
  }
  return out;
}

export function parseStrftime(p: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i] !== "%") { out.push(lit(p[i]!)); continue; }
    let j = i + 1;
    let colon = false, nopad = false;
    while (p[j] === "-" || p[j] === ":" || p[j] === "_" || p[j] === "0" || p[j] === "^" || p[j] === "#") { if (p[j] === ":") colon = true; if (p[j] === "-") nopad = true; j++; }
    const c = p[j];
    if (c === undefined) throw new PatternError('Pattern ends with a lone "%".');
    i = j;
    const U = (padded: Unit, plain: Unit) => out.push(unit(nopad ? plain : padded));
    switch (c) {
      case "Y": out.push(unit("Y4")); break;
      case "y": out.push(unit("Y2")); break;
      case "m": U("MON2", "MON1"); break;
      case "d": U("D2", "D1"); break;
      case "e": out.push(unit("D1")); break;
      case "b": case "h": out.push(unit("MONS")); break;
      case "B": out.push(unit("MONL")); break;
      case "H": U("H24_2", "H24_1"); break;
      case "I": U("H12_2", "H12_1"); break;
      case "M": out.push(unit("MIN2")); break;
      case "S": out.push(unit("SEC2")); break;
      case "f": out.push({ k: "frac", n: 6 }); break;
      case "L": out.push({ k: "frac", n: 3 }); break;
      case "N": out.push({ k: "frac", n: 9 }); break;
      case "p": out.push(unit("AMPM")); break;
      case "a": out.push(unit("DOWS")); break;
      case "A": out.push(unit("DOWL")); break;
      case "j": out.push(unit("DOY3")); break;
      case "z": out.push(unit(colon ? "TZOFFC" : "TZOFF")); break;
      case "Z": out.push(unit("TZNAME")); break;
      case "F": out.push(unit("Y4"), lit("-"), unit("MON2"), lit("-"), unit("D2")); break;
      case "T": out.push(unit("H24_2"), lit(":"), unit("MIN2"), lit(":"), unit("SEC2")); break;
      case "R": out.push(unit("H24_2"), lit(":"), unit("MIN2")); break;
      case "D": out.push(unit("MON2"), lit("/"), unit("D2"), lit("/"), unit("Y2")); break;
      case "%": out.push(lit("%")); break;
      case "n": out.push(lit("\n")); break;
      case "t": out.push(lit("\t")); break;
      default: throw new PatternError(`Unsupported strftime directive "%${c}".`);
    }
  }
  return out;
}

const MOMENT_TOKENS: [string, Token][] = [
  ["YYYY", unit("Y4")], ["YY", unit("Y2")], ["MMMM", unit("MONL")], ["MMM", unit("MONS")], ["MM", unit("MON2")], ["M", unit("MON1")],
  ["DDDD", unit("DOY3")], ["DD", unit("D2")], ["D", unit("D1")], ["dddd", unit("DOWL")], ["ddd", unit("DOWS")],
  ["HH", unit("H24_2")], ["H", unit("H24_1")], ["hh", unit("H12_2")], ["h", unit("H12_1")], ["mm", unit("MIN2")], ["m", unit("MIN2")],
  ["ss", unit("SEC2")], ["s", unit("SEC2")], ["SSSSSSSSS", { k: "frac", n: 9 }], ["SSSSSS", { k: "frac", n: 6 }], ["SSS", { k: "frac", n: 3 }],
  ["A", unit("AMPM")], ["a", unit("AMPM")], ["ZZ", unit("TZOFF")], ["Z", unit("TZOFFC")], ["z", unit("TZNAME")],
];

export function parseMoment(p: string): Token[] {
  const out: Token[] = [];
  for (let i = 0; i < p.length; ) {
    if (p[i] === "[") {
      const end = p.indexOf("]", i);
      if (end < 0) throw new PatternError("Unterminated [ ] escape in Moment/Day.js pattern.");
      out.push(lit(p.slice(i + 1, end))); i = end + 1; continue;
    }
    const hit = MOMENT_TOKENS.find(([t]) => p.startsWith(t, i));
    if (hit) { out.push(hit[1]); i += hit[0].length; continue; }
    if (/[A-Za-z]/.test(p[i]!)) throw new PatternError(`Unsupported Moment/Day.js token starting at "${p.slice(i, i + 3)}". Escape literal text in [brackets].`);
    out.push(lit(p[i]!)); i++;
  }
  return out;
}

const ORACLE_TOKENS: [string, Token][] = [
  ["YYYY", unit("Y4")], ["YY", unit("Y2")], ["MONTH", unit("MONL")], ["MON", unit("MONS")], ["MM", unit("MON2")], ["DDD", unit("DOY3")], ["DD", unit("D2")],
  ["DAY", unit("DOWL")], ["DY", unit("DOWS")], ["HH24", unit("H24_2")], ["HH12", unit("H12_2")], ["HH", unit("H12_2")], ["MI", unit("MIN2")], ["SS", unit("SEC2")],
  ["A.M.", unit("AMPM")], ["P.M.", unit("AMPM")], ["AM", unit("AMPM")], ["PM", unit("AMPM")], ["TZH:TZM", unit("TZOFFC")], ["TZR", unit("TZNAME")], ["TZD", unit("TZNAME")],
];

export function parseOracle(p: string): Token[] {
  const out: Token[] = [];
  const up = p.toUpperCase();
  for (let i = 0; i < p.length; ) {
    if (p[i] === '"') {
      const end = p.indexOf('"', i + 1);
      if (end < 0) throw new PatternError('Unterminated "quoted text" in Oracle format.');
      out.push(lit(p.slice(i + 1, end))); i = end + 1; continue;
    }
    if (up.startsWith("FM", i)) { i += 2; continue; } // fill-mode toggle: handled by the emitters' own padding rules
    const ff = /^FF([1-9]?)/.exec(up.slice(i));
    if (ff) { out.push({ k: "frac", n: ff[1] ? Number(ff[1]) : 6 }); i += ff[0].length; continue; }
    const hit = ORACLE_TOKENS.find(([t]) => up.startsWith(t, i));
    if (hit) { out.push(hit[1]); i += hit[0].length; continue; }
    if (/[A-Za-z]/.test(p[i]!)) throw new PatternError(`Unsupported Oracle format element starting at "${p.slice(i, i + 4)}". Quote literal text with "double quotes".`);
    out.push(lit(p[i]!)); i++;
  }
  return out;
}

/* ───────────── emitters ───────────── */

const JAVA: Record<Unit, string> = { Y4: "yyyy", Y2: "yy", MON2: "MM", MON1: "M", MONS: "MMM", MONL: "MMMM", D2: "dd", D1: "d", DOY3: "DDD", H24_2: "HH", H24_1: "H", H12_2: "hh", H12_1: "h", MIN2: "mm", SEC2: "ss", AMPM: "a", DOWS: "EEE", DOWL: "EEEE", TZOFF: "Z", TZOFFC: "XXX", TZNAME: "z" };
const STRF: Record<Unit, string> = { Y4: "%Y", Y2: "%y", MON2: "%m", MON1: "%-m", MONS: "%b", MONL: "%B", D2: "%d", D1: "%-d", DOY3: "%j", H24_2: "%H", H24_1: "%-H", H12_2: "%I", H12_1: "%-I", MIN2: "%M", SEC2: "%S", AMPM: "%p", DOWS: "%a", DOWL: "%A", TZOFF: "%z", TZOFFC: "%:z", TZNAME: "%Z" };
const MOM: Record<Unit, string> = { Y4: "YYYY", Y2: "YY", MON2: "MM", MON1: "M", MONS: "MMM", MONL: "MMMM", D2: "DD", D1: "D", DOY3: "DDDD", H24_2: "HH", H24_1: "H", H12_2: "hh", H12_1: "h", MIN2: "mm", SEC2: "ss", AMPM: "A", DOWS: "ddd", DOWL: "dddd", TZOFF: "ZZ", TZOFFC: "Z", TZNAME: "z" };
const ORA: Record<Unit, string> = { Y4: "YYYY", Y2: "YY", MON2: "MM", MON1: "FMMMFM", MONS: "Mon", MONL: "Month", D2: "DD", D1: "FMDDFM", DOY3: "DDD", H24_2: "HH24", H24_1: "FMHH24FM", H12_2: "HH12", H12_1: "FMHH12FM", MIN2: "MI", SEC2: "SS", AMPM: "AM", DOWS: "Dy", DOWL: "Day", TZOFF: "TZHTZM", TZOFFC: "TZH:TZM", TZNAME: "TZR" };

const hasLetter = (s: string) => /[A-Za-z]/.test(s);

export function emit(tokens: Token[], to: Dialect): { text: string; notes: string[] } {
  const notes: string[] = [];
  const note = (n: string) => { if (!notes.includes(n)) notes.push(n); };
  let text = "";
  for (const t of tokens) {
    if (t.k === "lit") {
      if (to === "java") text += hasLetter(t.v) || t.v === "'" ? `'${t.v.replace(/'/g, "''")}'` : t.v;
      else if (to === "strftime") text += t.v.replace(/%/g, "%%");
      else if (to === "moment") text += hasLetter(t.v) || /[\[\]]/.test(t.v) ? `[${t.v}]` : t.v;
      else text += hasLetter(t.v) || /["]/.test(t.v) || !/^[-/,.;: ]*$/.test(t.v) ? `"${t.v.replace(/"/g, "")}"` : t.v;
    } else if (t.k === "frac") {
      if (to === "java") text += "S".repeat(t.n);
      else if (to === "moment") {
        text += "S".repeat(Math.min(t.n, 9));
        if (t.n !== 3) note("Day.js supports only SSS (milliseconds); Moment supports 1–9 S characters.");
      }
      else if (to === "oracle") text += `FF${t.n}`;
      else {
        text += t.n === 3 ? "%L" : t.n === 9 ? "%N" : "%f";
        note(t.n === 6 ? "%f (microseconds) is Python/Ruby; GNU date uses %N (nanoseconds)." : "%L (milliseconds) and %N (nanoseconds) are Ruby/GNU; Python only has %f (6 digits).");
      }
    } else {
      text += ({ java: JAVA, strftime: STRF, moment: MOM, oracle: ORA } as const)[to][t.u];
      if (to === "strftime" && (t.u === "MON1" || t.u === "D1" || t.u === "H24_1" || t.u === "H12_1")) note("%-d / %-m / %-H / %-I (no padding) work on glibc/macOS/Ruby but not on Windows C runtimes; Python on Windows needs %#d.");
      if (to === "strftime" && t.u === "TZOFFC") note("%:z is GNU/Ruby (and Python 3.12+); older Python has only %z (+0530).");
      if (to === "oracle" && (t.u === "TZOFF")) note("Oracle has no compact +0530 element; TZHTZM is only valid for TIMESTAMP WITH TIME ZONE values.");
      if (to === "oracle" && (t.u === "H24_1" || t.u === "H12_1" || t.u === "MON1" || t.u === "D1")) note("Oracle un-padded elements use the FM toggle (FM…FM); FM stays on until repeated.");
      if (to === "java" && t.u === "Y4") note("Use yyyy (year-of-era) or uuuu (proleptic year) with DateTimeFormatter; avoid YYYY (week-based year) — a classic New Year bug.");
    }
  }
  return { text, notes };
}

/* ───────────── sample rendering ───────────── */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SAMPLE = { y: 2026, mo: 3, d: 7, h: 14, mi: 5, s: 9, frac: "123456789", dow: 6, doy: 66, off: "+0530", offc: "+05:30", tz: "IST" };

export const SAMPLE_LABEL = "2026-03-07 14:05:09.123456789 +05:30 (Saturday, day 66)";

export function renderSample(tokens: Token[]): string {
  const p2 = (n: number) => String(n).padStart(2, "0");
  const h12 = SAMPLE.h % 12 === 0 ? 12 : SAMPLE.h % 12;
  const map: Record<Unit, string> = {
    Y4: String(SAMPLE.y), Y2: String(SAMPLE.y % 100).padStart(2, "0"), MON2: p2(SAMPLE.mo), MON1: String(SAMPLE.mo), MONS: MONTHS[SAMPLE.mo - 1]!.slice(0, 3), MONL: MONTHS[SAMPLE.mo - 1]!,
    D2: p2(SAMPLE.d), D1: String(SAMPLE.d), DOY3: String(SAMPLE.doy).padStart(3, "0"), H24_2: p2(SAMPLE.h), H24_1: String(SAMPLE.h), H12_2: p2(h12), H12_1: String(h12),
    MIN2: p2(SAMPLE.mi), SEC2: p2(SAMPLE.s), AMPM: SAMPLE.h < 12 ? "AM" : "PM", DOWS: DAYS[SAMPLE.dow]!.slice(0, 3), DOWL: DAYS[SAMPLE.dow]!, TZOFF: SAMPLE.off, TZOFFC: SAMPLE.offc, TZNAME: SAMPLE.tz,
  };
  return tokens.map((t) => (t.k === "lit" ? t.v : t.k === "frac" ? SAMPLE.frac.slice(0, t.n).padEnd(t.n, "0") : map[t.u])).join("");
}

/* ───────────── public API ───────────── */

const PARSERS: Record<Dialect, (p: string) => Token[]> = { java: parseJava, strftime: parseStrftime, moment: parseMoment, oracle: parseOracle };
const NAMES: Record<Dialect, string> = { java: "Java        ", strftime: "strftime    ", moment: "Moment/Day.js", oracle: "Oracle      " };

export function convertDateFormat(input: string, options: JavaDateFormatConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const blocks: string[] = [];
  for (const [i, line] of lines.entries()) {
    let tokens: Token[];
    try {
      tokens = PARSERS[options.from](line);
    } catch (e) {
      return { output: "", error: { message: e instanceof Error ? e.message : "Invalid pattern", line: i + 1 } };
    }
    const rows = [line];
    if (options.showSample) rows.push(`  sample    ${renderSample(tokens)}   (for ${SAMPLE_LABEL})`);
    const allNotes: string[] = [];
    for (const to of ["java", "strftime", "moment", "oracle"] as const) {
      const { text, notes } = emit(tokens, to);
      rows.push(`  ${NAMES[to]} ${text}${to === options.from ? "   ← source (normalised)" : ""}`);
      if (to !== options.from) allNotes.push(...notes);
    }
    if (allNotes.length) rows.push("  notes:", ...[...new Set(allNotes)].map((n) => `    • ${n}`));
    blocks.push(rows.join("\n"));
  }
  return { output: blocks.join("\n\n"), error: null };
}
