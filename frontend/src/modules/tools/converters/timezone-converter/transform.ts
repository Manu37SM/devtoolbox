/** This tool's natural shape is "compute a table of converted times" rather
 * than a single input→output string, so `convertTimezones` returns
 * `{ rows, error }` instead of the standard `{ output, error }` contract —
 * see DEVELOPMENT_GUIDE.md's allowance for a different return shape when
 * the string-in/string-out pattern genuinely doesn't fit. Everything here
 * is pure (no DOM access): it only reads the `datetime-local` string and
 * timezone names passed in and uses the standard `Intl` API. */

// A curated list of commonly used IANA timezone names, used instead of the
// runtime `Intl.supportedValuesOf("timeZone")` API — that API isn't covered
// by this project's `tsconfig.base.json` `lib` array (`["ES2022"]`, no
// `"ES2024.Intl"|"DOM"`), so referencing it would fail strict type-checking
// without editing tsconfig (out of scope for this change).
export const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "America/Sao_Paulo",
  "America/Mexico_City",
  "America/Toronto",
  "America/Bogota",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Karachi",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
] as const;

export interface TimezoneRow {
  timezone: string;
  formatted: string;
}

export interface TimezoneConversionResult {
  rows: TimezoneRow[];
  error: { message: string } | null;
}

/** Returns the offset (in minutes, UTC minus local) that `timeZone` has at
 * the instant `date` represents — i.e. how many minutes must be added to a
 * UTC timestamp to get that zone's wall-clock reading. Throws a
 * `RangeError` if `timeZone` isn't a recognized IANA zone name, which
 * callers use to validate user-supplied zone names. */
function getOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtcMs = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtcMs - date.getTime()) / 60000;
}

/** Interprets a `datetime-local`-shaped string (`YYYY-MM-DDTHH:mm[:ss]`,
 * no timezone info) as wall-clock time *in* `timeZone`, returning the
 * corresponding absolute `Date`. Returns `null` if the string doesn't
 * parse or `timeZone` isn't recognized. */
export function parseAsZonedTime(datetimeLocal: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(datetimeLocal);
  if (!match) return null;

  const [, y, mo, d, h, mi, s] = match;
  const naiveUtcMs = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), s ? Number(s) : 0);
  if (Number.isNaN(naiveUtcMs)) return null;

  try {
    const offsetMinutes = getOffsetMinutes(new Date(naiveUtcMs), timeZone);
    return new Date(naiveUtcMs - offsetMinutes * 60000);
  } catch {
    return null;
  }
}

export function convertTimezones(
  datetimeLocal: string,
  sourceTimezone: string,
  targetTimezones: string[],
): TimezoneConversionResult {
  if (!datetimeLocal) {
    return { rows: [], error: null };
  }

  const instant = parseAsZonedTime(datetimeLocal, sourceTimezone);
  if (instant === null) {
    return {
      rows: [],
      error: { message: `Invalid date/time or timezone: "${datetimeLocal}" in "${sourceTimezone}".` },
    };
  }

  try {
    const rows = targetTimezones.map((tz) => ({
      timezone: tz,
      formatted: new Intl.DateTimeFormat(undefined, {
        timeZone: tz,
        dateStyle: "medium",
        timeStyle: "short",
      }).format(instant),
    }));
    return { rows, error: null };
  } catch (err) {
    return { rows: [], error: { message: err instanceof Error ? err.message : "Failed to convert timezones." } };
  }
}
