import type { TransformResult } from "@/lib/tool-transform";
import type { SmpteTimecodeConverterOptions } from "./schema";

type Opts = SmpteTimecodeConverterOptions;

export interface Rate {
  label: string;
  num: number;
  den: number;
  /** timecode frames per second */
  nominal: number;
  /** frames dropped per minute in drop-frame counting (0 = none available) */
  drop: number;
}

export const RATES: Record<string, Rate> = {
  "23.976": { label: "23.976", num: 24000, den: 1001, nominal: 24, drop: 0 },
  "24": { label: "24", num: 24, den: 1, nominal: 24, drop: 0 },
  "25": { label: "25", num: 25, den: 1, nominal: 25, drop: 0 },
  "29.97": { label: "29.97", num: 30000, den: 1001, nominal: 30, drop: 2 },
  "30": { label: "30", num: 30, den: 1, nominal: 30, drop: 0 },
  "47.952": { label: "47.952", num: 48000, den: 1001, nominal: 48, drop: 0 },
  "48": { label: "48", num: 48, den: 1, nominal: 48, drop: 0 },
  "50": { label: "50", num: 50, den: 1, nominal: 50, drop: 0 },
  "59.94": { label: "59.94", num: 60000, den: 1001, nominal: 60, drop: 4 },
  "60": { label: "60", num: 60, den: 1, nominal: 60, drop: 0 },
};

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** Frame count (0-based) → timecode fields. */
export function framesToTc(frames: number, r: Rate, df: boolean): { h: number; m: number; s: number; f: number; neg: boolean } {
  const neg = frames < 0;
  let n = Math.abs(frames);
  const nom = r.nominal;
  if (df && r.drop) {
    const dropPerMin = r.drop;
    const framesPer10Min = nom * 600 - dropPerMin * 9;
    const framesPerMin = nom * 60 - dropPerMin;
    const d = Math.floor(n / framesPer10Min);
    const m = n % framesPer10Min;
    n += dropPerMin * 9 * d + (m >= dropPerMin ? dropPerMin * Math.floor((m - dropPerMin) / framesPerMin) : 0);
  }
  const f = n % nom;
  const s = Math.floor(n / nom) % 60;
  const mi = Math.floor(n / (nom * 60)) % 60;
  const h = Math.floor(n / (nom * 3600));
  return { h, m: mi, s, f, neg };
}

/** Timecode fields → frame count (0-based). Throws on impossible values. */
export function tcToFrames(h: number, m: number, s: number, f: number, r: Rate, df: boolean): number {
  if (m > 59 || s > 59) throw new Error(`minutes and seconds must be below 60 (got ${pad(m)}:${pad(s)})`);
  if (f >= r.nominal) throw new Error(`frame ${f} is out of range at ${r.label} fps (0-${r.nominal - 1})`);
  if (df && r.drop) {
    if (s === 0 && f < r.drop && m % 10 !== 0) throw new Error(`${pad(h)}:${pad(m)}:00;${pad(f)} does not exist in drop-frame: frames 0-${r.drop - 1} are skipped at the start of every minute except every tenth`);
    const totalMin = h * 60 + m;
    return (h * 3600 + m * 60 + s) * r.nominal + f - r.drop * (totalMin - Math.floor(totalMin / 10));
  }
  return (h * 3600 + m * 60 + s) * r.nominal + f;
}

export const fmtTc = (t: { h: number; m: number; s: number; f: number; neg: boolean }, df: boolean, r: Rate) =>
  `${t.neg ? "-" : ""}${pad(t.h)}:${pad(t.m)}:${pad(t.s)}${df && r.drop ? ";" : ":"}${pad(t.f, r.nominal >= 100 ? 3 : 2)}`;

export const framesToSeconds = (frames: number, r: Rate) => (frames * r.den) / r.num;
export const secondsToFrames = (sec: number, r: Rate) => Math.round((sec * r.num) / r.den);

function fmtClock(sec: number): string {
  const neg = sec < 0;
  const totalMs = Math.round(Math.abs(sec) * 1000);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 60000) % 60;
  const h = Math.floor(totalMs / 3600000);
  return `${neg ? "-" : ""}${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

interface Parsed {
  frames: number;
  kind: "timecode" | "frames" | "seconds" | "clock";
  df?: boolean;
}

export function parseValue(raw: string, r: Rate, dfDefault: boolean, startFrames: number): Parsed {
  const s = raw.trim();
  let m = /^(-)?(\d{1,3}):(\d{1,2}):(\d{1,2})([:;.,])(\d{1,3})$/.exec(s);
  if (m && !(m[5] === "." && m[6]!.length === 3)) {
    // ";" (or "." / ",") always means drop-frame; ":" follows the drop-frame setting
    const useDf = m[5] !== ":" ? true : dfDefault;
    if (m[5] !== ":" && !r.drop) throw new Error(`${r.label} fps has no drop-frame counting; use ":" before the frames`);
    const abs = tcToFrames(Number(m[2]), Number(m[3]), Number(m[4]), Number(m[6]), r, useDf);
    return { frames: (m[1] ? -1 : 1) * abs - startFrames, kind: "timecode", df: useDf && r.drop > 0 };
  }
  m = /^(-)?(\d+):(\d{2}):(\d{2})\.(\d{3})$/.exec(s);
  if (m) {
    const sec = (m[1] ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]) + Number(m[5]) / 1000);
    return { frames: secondsToFrames(sec, r), kind: "clock" };
  }
  m = /^(-?\d+(?:\.\d+)?)s$/i.exec(s) ?? /^(-?\d+\.\d+)$/.exec(s);
  if (m) return { frames: secondsToFrames(Number(m[1]), r), kind: "seconds" };
  m = /^(-?\d+)f?$/i.exec(s);
  if (m) return { frames: Number(m[1]), kind: "frames" };
  throw new Error(`Can't read "${raw}": use 01:00:00:00, 01:00:00;00 (drop-frame), 1800f, 12.5s or 00:01:02.500`);
}

function tableFor(frames: number, r: Rate, df: boolean, startFrames: number, startLabel: string): string[] {
  const abs = frames + startFrames;
  const t = fmtTc(framesToTc(abs, r, df), df, r);
  const sec = framesToSeconds(frames, r);
  const rows: Array<[string, string]> = [
    ["Timecode", t + (df && r.drop ? "  (drop-frame)" : r.drop ? "  (non-drop)" : "")],
    ["Frames", String(frames)],
    ["Seconds (real)", Number(sec.toFixed(6)).toString()],
    ["Clock time", fmtClock(sec)],
  ];
  if (r.drop) rows.push([df ? "Non-drop equivalent" : "Drop-frame equivalent", fmtTc(framesToTc(df ? frames + startFrames : abs, r, !df), !df, r)]);
  if (startFrames) rows.splice(1, 0, ["Absolute frame", String(abs)]);
  if (r.nominal === 24) rows.push(["35mm 4-perf feet+frames", `${Math.floor(Math.abs(frames) / 16)}+${pad(Math.abs(frames) % 16)}`]);
  const w = Math.max(...rows.map((x) => x[0].length));
  void startLabel;
  return rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`);
}

export function smpteTimecodeConverter(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    fps: options.fps ?? "29.97",
    dropFrame: options.dropFrame ?? true,
    mode: options.mode ?? "convert",
    targetFps: options.targetFps ?? "25",
    retimeMethod: options.retimeMethod ?? "time",
    startTc: options.startTc ?? "00:00:00:00",
    output: options.output ?? "table",
  };
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return { output: "", error: null };
  const r = RATES[o.fps]!;
  const df = o.dropFrame && r.drop > 0;
  try {
    let startFrames = 0;
    if (o.startTc.trim() && o.startTc.trim() !== "00:00:00:00") {
      const p = parseValue(o.startTc, r, df, 0);
      if (p.kind !== "timecode") throw new Error("Start timecode must look like 01:00:00:00");
      startFrames = p.frames;
    }
    const notes: string[] = [];
    const fmtOne = (frames: number, rate: Rate, d: boolean): string => {
      switch (o.output) {
        case "timecode": return fmtTc(framesToTc(frames + (rate === r ? startFrames : 0), rate, d), d, rate);
        case "frames": return String(frames);
        case "seconds": return Number(framesToSeconds(frames, rate).toFixed(6)).toString();
        case "clock": return fmtClock(framesToSeconds(frames, rate));
        default: return "";
      }
    };

    if (o.mode === "convert") {
      const out: string[] = [];
      for (const line of lines) {
        try {
          const p = parseValue(line, r, df, startFrames);
          if (o.output === "table") out.push((lines.length > 1 ? `# ${line}\n` : "") + tableFor(p.frames, r, df, startFrames, o.startTc).join("\n"));
          else out.push(lines.length > 1 ? `${line}\t${fmtOne(p.frames, r, df)}` : fmtOne(p.frames, r, df));
        } catch (e) {
          if (lines.length === 1) throw e;
          out.push(`${line}\t! ${(e as Error).message}`);
        }
      }
      return { output: [...out.join(o.output === "table" ? "\n\n" : "\n").split("\n"), ...notes].join("\n"), error: null };
    }

    if (o.mode === "sum" || o.mode === "difference") {
      if (o.mode === "difference" && lines.length < 2) throw new Error("Give at least two values: the first minus the others");
      const vals = lines.map((l) => parseValue(l, r, df, 0));
      // timecodes in sum/difference are treated as durations from 00:00:00:00 (start offset ignored)
      const total = o.mode === "sum" ? vals.reduce((a, v) => a + v.frames, 0) : vals.slice(1).reduce((a, v) => a - v.frames, vals[0]!.frames);
      const head = `${o.mode === "sum" ? "Sum" : "Difference"} of ${lines.length} values (as durations)`;
      const body = o.output === "table" ? tableFor(total, r, df, 0, "").join("\n") : fmtOne(total, r, df);
      return { output: [head, "", body, ...notes].join("\n"), error: null };
    }

    // retime
    const tr = RATES[o.targetFps]!;
    const tdf = o.dropFrame && tr.drop > 0;
    const out: string[] = [];
    for (const line of lines) {
      const p = parseValue(line, r, df, startFrames);
      const secs = framesToSeconds(p.frames, r);
      const nf = o.retimeMethod === "time" ? secondsToFrames(secs, tr) : p.frames;
      const exact = (secs * tr.num) / tr.den;
      const speed = (tr.num / tr.den) / (r.num / r.den);
      const row = `${fmtTc(framesToTc(p.frames + startFrames, r, df), df, r)} @ ${r.label} → ${fmtTc(framesToTc(nf + (o.retimeMethod === "frames" ? startFrames : 0), tr, tdf), tdf, tr)} @ ${tr.label}`;
      const extra = o.retimeMethod === "time" ? `   (${nf} frames; exact ${Number(exact.toFixed(3))}, rounded to nearest)` : `   (same ${nf} frames, plays at ${Number((speed * 100).toFixed(3))}% speed, ${fmtClock(framesToSeconds(nf, tr))})`;
      out.push(row + extra);
    }
    return { output: out.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
