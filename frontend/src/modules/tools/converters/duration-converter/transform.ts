import type { TransformResult } from "@/lib/tool-transform";
import type { DurationConverterOptions } from "./schema";

const UNIT_MS: Record<string, number> = {
  ms: 1, msec: 1, millisecond: 1, milliseconds: 1,
  s: 1000, sec: 1000, secs: 1000, second: 1000, seconds: 1000,
  m: 60_000, min: 60_000, mins: 60_000, minute: 60_000, minutes: 60_000,
  h: 3_600_000, hr: 3_600_000, hrs: 3_600_000, hour: 3_600_000, hours: 3_600_000,
  d: 86_400_000, day: 86_400_000, days: 86_400_000,
  w: 604_800_000, wk: 604_800_000, week: 604_800_000, weeks: 604_800_000,
};

/** Parses "1h 30m", "2 days 3 hours", "01:30:45", "90", "PT1H30M". Returns milliseconds. */
export function parseDuration(text: string, defaultUnit: DurationConverterOptions["defaultUnit"] = "s"): number | null {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  const neg = t.startsWith("-");
  const s = neg ? t.slice(1).trim() : t;
  const sign = neg ? -1 : 1;
  const clock = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:\.(\d+))?$/.exec(s);
  if (clock) {
    const h = Number(clock[1] ?? 0), m = Number(clock[2]), sec = Number(clock[3]);
    const ms = clock[4] ? Math.round(Number(`0.${clock[4]}`) * 1000) : 0;
    return sign * (h * 3_600_000 + m * 60_000 + sec * 1000 + ms);
  }
  const iso = /^p(?:(\d+(?:\.\d+)?)w)?(?:(\d+(?:\.\d+)?)d)?(?:t(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m)?(?:(\d+(?:\.\d+)?)s)?)?$/.exec(s);
  if (iso && s.length > 1 && !s.endsWith("t")) {
    const [w, d, h, m, sec] = iso.slice(1).map((x) => Number(x ?? 0)) as [number, number, number, number, number];
    return sign * (w * 604_800_000 + d * 86_400_000 + h * 3_600_000 + m * 60_000 + sec * 1000);
  }
  if (/^\d+(\.\d+)?$/.test(s)) return sign * Number(s) * UNIT_MS[defaultUnit]!;
  let total = 0;
  let rest = s.replace(/,/g, " ").replace(/\band\b/g, " ");
  const re = /^\s*(\d+(?:\.\d+)?)\s*([a-z]+)/;
  while (rest.trim()) {
    const m = re.exec(rest);
    if (!m) return null;
    const u = UNIT_MS[m[2]!];
    if (u === undefined) return null;
    total += Number(m[1]) * u;
    rest = rest.slice(m[0].length);
  }
  return sign * total;
}

export function humanize(ms: number): string {
  if (ms === 0) return "0 seconds";
  const neg = ms < 0;
  let r = Math.round(Math.abs(ms));
  const parts: string[] = [];
  for (const [name, size] of [["week", 604_800_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000], ["second", 1000], ["millisecond", 1]] as const) {
    const q = Math.floor(r / size);
    r -= q * size;
    if (q) parts.push(`${q} ${name}${q === 1 ? "" : "s"}`);
  }
  return (neg ? "-" : "") + parts.join(" ");
}

export function clockFormat(ms: number): string {
  const neg = ms < 0;
  const total = Math.round(Math.abs(ms));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const frac = total % 1000;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${neg ? "-" : ""}${p(h)}:${p(m)}:${p(s)}${frac ? "." + String(frac).padStart(3, "0") : ""}`;
}

export function isoDuration(ms: number): string {
  if (ms < 0) return "(negative durations have no ISO 8601 form)";
  let r = Math.round(ms);
  const d = Math.floor(r / 86_400_000); r -= d * 86_400_000;
  const h = Math.floor(r / 3_600_000); r -= h * 3_600_000;
  const m = Math.floor(r / 60_000); r -= m * 60_000;
  const s = r / 1000;
  const date = d ? `${d}D` : "";
  const time = `${h ? h + "H" : ""}${m ? m + "M" : ""}${s ? s + "S" : ""}`;
  return !date && !time ? "PT0S" : `P${date}${time ? "T" + time : ""}`;
}

const trim = (n: number, d = 6) => String(Number(n.toFixed(d)));

export function convertDurations(input: string, options: DurationConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const bad: string[] = [];
  const blocks = lines.map((line) => {
    const ms = parseDuration(line, options.defaultUnit);
    if (ms === null) { bad.push(line); return `> ${line}\n  Could not parse`; }
    return [
      `> ${line}`,
      `  Human:     ${humanize(ms)}`,
      `  Clock:     ${clockFormat(ms)}`,
      `  ISO 8601:  ${isoDuration(ms)}`,
      `  Total:     ${trim(ms, 3)} ms = ${trim(ms / 1000)} s = ${trim(ms / 60_000)} min = ${trim(ms / 3_600_000)} h = ${trim(ms / 86_400_000)} d`,
    ].join("\n");
  });
  return { output: blocks.join("\n\n"), error: bad.length ? { message: `Could not parse: ${bad.slice(0, 3).join(", ")}` } : null };
}
