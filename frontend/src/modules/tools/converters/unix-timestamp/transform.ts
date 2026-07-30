import type { UnixTimestampUnit } from "./schema";

export interface TimestampConversion {
  iso: string;
  utc: string;
  local: string;
  relative: string;
  error: string | null;
}

/** Converts a Unix timestamp (seconds or milliseconds) to human-readable
 * formats. Pure aside from reading the ambient clock/timezone, which is
 * acceptable here since the tool's entire purpose is "what time is it" —
 * still fully deterministic given `now`. */
export function timestampToHuman(
  input: string,
  unit: UnixTimestampUnit,
  now: number = Date.now(),
): TimestampConversion {
  const empty: TimestampConversion = { iso: "", utc: "", local: "", relative: "", error: null };
  const trimmed = input.trim();
  if (trimmed.length === 0) return empty;

  if (!/^-?\d+$/.test(trimmed)) {
    return { ...empty, error: "Enter a whole number of seconds or milliseconds." };
  }

  const value = Number(trimmed);
  const ms = unit === "seconds" ? value * 1000 : value;
  const date = new Date(ms);

  if (Number.isNaN(date.getTime())) {
    return { ...empty, error: "That value is out of range for a valid date." };
  }

  return {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    relative: relativeTime(ms, now),
    error: null,
  };
}

/** Converts a human date string to Unix timestamps in both units. */
export function humanToTimestamp(input: string): { seconds: string; milliseconds: string; error: string | null } {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { seconds: "", milliseconds: "", error: null };

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return { seconds: "", milliseconds: "", error: "Could not parse this date." };
  }

  return {
    seconds: Math.floor(date.getTime() / 1000).toString(),
    milliseconds: date.getTime().toString(),
    error: null,
  };
}

function relativeTime(targetMs: number, nowMs: number): string {
  const diffSeconds = Math.round((targetMs - nowMs) / 1000);
  const abs = Math.abs(diffSeconds);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (abs >= seconds || unit === "second") {
      return rtf.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return rtf.format(diffSeconds, "second");
}
