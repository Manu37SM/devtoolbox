import type { TransformResult } from "@/lib/tool-transform";
import type { IsoDurationOptions } from "./schema";

export interface ParsedDuration {
  negative: boolean;
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// Calendar units have no fixed length; these are the conventional approximations
// used by most duration libraries and are called out in the UI output.
const SECONDS_PER = {
  year: 365 * 86_400,
  month: 30 * 86_400,
  week: 7 * 86_400,
  day: 86_400,
  hour: 3_600,
  minute: 60,
} as const;

const NUM = "(\\d+(?:[.,]\\d+)?)";
const DURATION_PATTERN = new RegExp(
  `^([-+])?P(?:${NUM}Y)?(?:${NUM}M)?(?:${NUM}W)?(?:${NUM}D)?(?:T(?:${NUM}H)?(?:${NUM}M)?(?:${NUM}S)?)?$`,
  "i",
);

const toNum = (s: string | undefined) => (s === undefined ? 0 : Number(s.replace(",", ".")));

export function parseIsoDuration(input: string): ParsedDuration {
  const text = input.trim();
  const m = DURATION_PATTERN.exec(text);
  if (!m || text.toUpperCase().endsWith("T") || /^[-+]?P$/i.test(text)) {
    throw new Error(`"${text}" is not a valid ISO 8601 duration (example: P1Y2M3DT4H5M6S).`);
  }
  return {
    negative: m[1] === "-",
    years: toNum(m[2]),
    months: toNum(m[3]),
    weeks: toNum(m[4]),
    days: toNum(m[5]),
    hours: toNum(m[6]),
    minutes: toNum(m[7]),
    seconds: toNum(m[8]),
  };
}

export function durationToSeconds(d: ParsedDuration): number {
  const total =
    d.years * SECONDS_PER.year +
    d.months * SECONDS_PER.month +
    d.weeks * SECONDS_PER.week +
    d.days * SECONDS_PER.day +
    d.hours * SECONDS_PER.hour +
    d.minutes * SECONDS_PER.minute +
    d.seconds;
  // Round away float noise from fractional components (0.1 * 3600 etc.).
  const rounded = Math.round(total * 1e6) / 1e6;
  return d.negative ? -rounded : rounded;
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

export function durationToHuman(d: ParsedDuration): string {
  const parts: string[] = [];
  const push = (n: number, unit: string) => {
    if (n !== 0) parts.push(plural(n, unit));
  };
  push(d.years, "year");
  push(d.months, "month");
  push(d.weeks, "week");
  push(d.days, "day");
  push(d.hours, "hour");
  push(d.minutes, "minute");
  push(d.seconds, "second");
  if (parts.length === 0) return "0 seconds";
  return (d.negative ? "minus " : "") + parts.join(", ");
}

export function secondsToIso(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds)) throw new Error("Seconds must be a finite number.");
  const negative = totalSeconds < 0;
  let ms = Math.round(Math.abs(totalSeconds) * 1000);
  if (ms === 0) return "PT0S";

  const days = Math.floor(ms / 86_400_000);
  ms -= days * 86_400_000;
  const hours = Math.floor(ms / 3_600_000);
  ms -= hours * 3_600_000;
  const minutes = Math.floor(ms / 60_000);
  ms -= minutes * 60_000;
  const seconds = ms / 1000;

  let out = negative ? "-P" : "P";
  if (days) out += `${days}D`;
  if (hours || minutes || seconds) {
    out += "T";
    if (hours) out += `${hours}H`;
    if (minutes) out += `${minutes}M`;
    if (seconds) out += `${seconds}S`;
  }
  return out;
}

export function convertIsoDuration(input: string, options: IsoDurationOptions): TransformResult {
  const text = input.trim();
  if (text.length === 0) return { output: "", error: null };
  try {
    if (options.mode === "seconds-to-iso") {
      if (!/^[-+]?(\d+(\.\d+)?|\.\d+)$/.test(text)) throw new Error(`"${text}" is not a number of seconds.`);
      return { output: secondsToIso(Number(text)), error: null };
    }
    const parsed = parseIsoDuration(text);
    if (options.mode === "iso-to-human") return { output: durationToHuman(parsed), error: null };

    const seconds = durationToSeconds(parsed);
    const approximate = parsed.years !== 0 || parsed.months !== 0;
    const note = approximate ? "\n(approximate: 1 year = 365 days, 1 month = 30 days)" : "";
    return { output: `${seconds}${note}`, error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not convert input." } };
  }
}
