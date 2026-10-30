import type { ResolvedTimestampUnit, UnixTimestampUnit } from "./schema";

export interface TimestampConversion {
  iso: string;
  utc: string;
  local: string;
  /** The instant in the requested IANA zone, with its offset, e.g. "2026-10-30 12:43:00 +05:30". */
  zoned: string;
  relative: string;
  /** Unit actually used (differs from the request only for "auto"). */
  unit: ResolvedTimestampUnit | null;
  error: string | null;
}

const NS_PER: Record<ResolvedTimestampUnit, bigint> = {
  seconds: 1_000_000_000n,
  milliseconds: 1_000_000n,
  microseconds: 1_000n,
  nanoseconds: 1n,
};

/** Java/JS Date range is ±8.64e15 ms; beyond that there is no calendar date to show. */
const MAX_MS = 8_640_000_000_000_000n;

export function detectUnit(digits: string): ResolvedTimestampUnit {
  const n = digits.replace(/^-/, "").length;
  if (n >= 18) return "nanoseconds";
  if (n >= 15) return "microseconds";
  if (n >= 12) return "milliseconds";
  return "seconds";
}

function floorDiv(a: bigint, b: bigint): bigint {
  const q = a / b;
  return a % b !== 0n && a < 0n !== b < 0n ? q - 1n : q;
}

/** ISO 8601 with as many fraction digits as the unit carries (3 for s/ms so old output is unchanged). */
function isoWithFraction(ns: bigint, unit: ResolvedTimestampUnit): string {
  const ms = floorDiv(ns, 1_000_000n);
  const base = new Date(Number(ms)).toISOString(); // ...T12:00:00.123Z
  const subMs = ns - ms * 1_000_000n; // 0..999999
  if (unit === "microseconds") return base.replace("Z", (subMs / 1000n).toString().padStart(3, "0") + "Z");
  if (unit === "nanoseconds") return base.replace("Z", subMs.toString().padStart(6, "0") + "Z");
  return base;
}

export function formatInZone(date: Date, timeZone: string, fraction = ""): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}${fraction} ${offset}`;
}

export function timestampToHuman(
  input: string,
  unit: UnixTimestampUnit,
  now: number = Date.now(),
  timeZone = "UTC",
): TimestampConversion {
  const empty: TimestampConversion = { iso: "", utc: "", local: "", zoned: "", relative: "", unit: null, error: null };
  // Accept digit separators people paste from code: 1_700_000_000, 1,700,000,000.
  const trimmed = input.trim().replace(/[_,\s]/g, "");
  if (trimmed.length === 0) return empty;

  if (!/^-?\d+$/.test(trimmed)) {
    return { ...empty, error: "Enter a whole number (seconds, milliseconds, microseconds or nanoseconds)." };
  }

  const resolved = unit === "auto" ? detectUnit(trimmed) : unit;
  const ns = BigInt(trimmed) * NS_PER[resolved];
  const ms = floorDiv(ns, 1_000_000n);
  if (ms > MAX_MS || ms < -MAX_MS) {
    return { ...empty, unit: resolved, error: "That value is out of range for a valid date." };
  }
  const date = new Date(Number(ms));
  const iso = isoWithFraction(ns, resolved);

  let zoned: string;
  try {
    zoned = formatInZone(date, timeZone, resolved === "seconds" ? "" : iso.slice(19, -1));
  } catch {
    return { ...empty, unit: resolved, error: `Unknown time zone "${timeZone}".` };
  }

  return {
    iso,
    utc: date.toUTCString(),
    local: date.toString(),
    zoned,
    relative: relativeTime(Number(ms), now),
    unit: resolved,
    error: null,
  };
}

export interface HumanToTimestampResult {
  seconds: string;
  milliseconds: string;
  microseconds: string;
  nanoseconds: string;
  error: string | null;
}

export function humanToTimestamp(input: string): HumanToTimestampResult {
  const empty = { seconds: "", milliseconds: "", microseconds: "", nanoseconds: "" };
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ...empty, error: null };

  // Date() keeps only milliseconds; keep up to 9 fraction digits ourselves (Java Instant / Go time precision).
  const frac = /T\d{2}:\d{2}:\d{2}[.,](\d{4,9})/.exec(trimmed);
  const date = new Date(frac ? trimmed.replace(frac[1]!, frac[1]!.slice(0, 3)) : trimmed);
  if (Number.isNaN(date.getTime())) {
    return { ...empty, error: "Could not parse this date." };
  }

  const subMs = frac ? BigInt(frac[1]!.slice(3).padEnd(6, "0")) : 0n;
  const ns = BigInt(date.getTime()) * 1_000_000n + subMs;
  return {
    seconds: floorDiv(ns, NS_PER.seconds).toString(),
    milliseconds: floorDiv(ns, NS_PER.milliseconds).toString(),
    microseconds: floorDiv(ns, NS_PER.microseconds).toString(),
    nanoseconds: ns.toString(),
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
