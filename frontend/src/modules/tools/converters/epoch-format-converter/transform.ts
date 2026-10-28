import type { TransformResult } from "@/lib/tool-transform";
import type { EpochFormatConverterOptions } from "./schema";

const E9 = 1_000_000_000n;
const DAY_NS = 86_400n * E9;
const FILETIME_OFFSET = 116_444_736_000_000_000n; // 100ns ticks, 1601 -> 1970
const TICKS_OFFSET = 621_355_968_000_000_000n; // 100ns ticks, 0001 -> 1970
const COCOA_OFFSET_S = 978_307_200n;
const GPS_OFFSET_S = 315_964_800n;
const EXCEL_EPOCH_DAYS = 25569n; // 1970-01-01 as a 1900-system serial
const JD_EPOCH_X2 = 4_881_175n; // 2440587.5 * 2

/** Parse a decimal string into an integer scaled by 10^scale (truncating extra digits). */
export function decToBig(s: string, scale: number): bigint | null {
  const m = /^([+-])?(\d+)?(?:\.(\d*))?$/.exec(s.trim().replace(/_/g, ""));
  if (!m || (m[2] === undefined && !m[3])) return null;
  const frac = (m[3] ?? "").slice(0, scale).padEnd(scale, "0");
  const v = BigInt(m[2] ?? "0") * 10n ** BigInt(scale) + BigInt(frac || "0");
  return m[1] === "-" ? -v : v;
}

const floorDiv = (a: bigint, b: bigint) => { const q = a / b; return (a % b !== 0n && (a < 0n) !== (b < 0n)) ? q - 1n : q; };
const mod = (a: bigint, b: bigint) => a - floorDiv(a, b) * b;

export function toNanos(raw: string, from: EpochFormatConverterOptions["from"]): bigint | string {
  const bad = `Cannot read "${raw.trim()}" as ${from}`;
  if (from === "iso") {
    const t = Date.parse(raw.trim());
    return Number.isNaN(t) ? bad : BigInt(t) * 1_000_000n;
  }
  const n9 = decToBig(raw, 9); // value * 1e9
  if (n9 === null) return bad;
  switch (from) {
    case "unix-s": return n9;
    case "unix-ms": return n9 / 1000n;
    case "unix-us": return n9 / 1_000_000n;
    case "unix-ns": return n9 / E9;
    case "windows-filetime": return ((n9 / E9) - FILETIME_OFFSET) * 100n;
    case "dotnet-ticks": return ((n9 / E9) - TICKS_OFFSET) * 100n;
    case "webkit": return ((n9 / E9) - FILETIME_OFFSET / 10n) * 1000n;
    case "excel-serial": return n9 * 86_400n - EXCEL_EPOCH_DAYS * DAY_NS;
    case "apple-cocoa": return n9 + COCOA_OFFSET_S * E9;
    case "gps-seconds": return n9 + GPS_OFFSET_S * E9;
    case "julian-day": return n9 * 86_400n - (JD_EPOCH_X2 * DAY_NS) / 2n;
  }
}

export function isoFromNanos(ns: bigint): string | null {
  const secs = floorDiv(ns, E9), frac = mod(ns, E9);
  const ms = secs * 1000n;
  if (ms > 8_640_000_000_000_000n || ms < -8_640_000_000_000_000n) return null;
  const base = new Date(Number(ms)).toISOString().replace(/\.000Z$/, "Z");
  if (frac === 0n) return base;
  const digits = frac % 1_000_000n === 0n ? 3 : frac % 1000n === 0n ? 6 : 9;
  return base.replace("Z", `.${frac.toString().padStart(9, "0").slice(0, digits)}Z`);
}

const fmtDecimal = (scaled: bigint, scale: number, keep = 6) => {
  const neg = scaled < 0n, a = neg ? -scaled : scaled, d = 10n ** BigInt(scale);
  const frac = (a % d).toString().padStart(scale, "0").slice(0, keep).replace(/0+$/, "");
  return `${neg ? "-" : ""}${a / d}${frac ? "." + frac : ""}`;
};

export function runEpochConverter(input: string, o: EpochFormatConverterOptions): TransformResult {
  const raw = input.trim();
  if (!raw) return { output: "", error: null };
  const ns = toNanos(raw, o.from);
  if (typeof ns === "string") return { output: "", error: { message: ns } };
  const iso = isoFromNanos(ns);
  if (!iso) return { output: "", error: { message: "Date is outside the range JavaScript can represent (about +/-275,760 years)" } };
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekday = days[Number(mod(floorDiv(ns, DAY_NS) + 4n, 7n))]!;
  // Days scaled by 1e9: ns / 86400e9 days * 1e9 = ns / 86400.
  const excel = fmtDecimal(floorDiv(ns, 86_400n) + EXCEL_EPOCH_DAYS * E9, 9);
  const jd = fmtDecimal(floorDiv(ns, 86_400n) + (JD_EPOCH_X2 * E9) / 2n, 9);
  const rows: Array<[string, string]> = [
    ["ISO 8601 (UTC)", iso],
    ["Weekday (UTC)", weekday],
    ["Unix seconds", floorDiv(ns, E9).toString()],
    ["Unix milliseconds", floorDiv(ns, 1_000_000n).toString()],
    ["Unix microseconds", floorDiv(ns, 1000n).toString()],
    ["Unix nanoseconds", ns.toString()],
    ["Windows FILETIME / LDAP", (floorDiv(ns, 100n) + FILETIME_OFFSET).toString()],
    [".NET ticks", (floorDiv(ns, 100n) + TICKS_OFFSET).toString()],
    ["WebKit / Chrome (us since 1601)", (floorDiv(ns, 1000n) + FILETIME_OFFSET / 10n).toString()],
    ["Excel serial (1900 system)", excel],
    ["Apple Cocoa (s since 2001)", (floorDiv(ns, E9) - COCOA_OFFSET_S).toString()],
    ["GPS seconds (no leap seconds)", (floorDiv(ns, E9) - GPS_OFFSET_S).toString()],
    ["Julian Day", jd],
  ];
  const w = Math.max(...rows.map(([k]) => k.length));
  return { output: rows.map(([k, v]) => `${k.padEnd(w)}  ${v}`).join("\n"), error: null };
}
