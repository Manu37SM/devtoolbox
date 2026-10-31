import type { TransformResult } from "@/lib/tool-transform";
import type { MeetingTimePlannerOptions } from "./schema";

type Opts = MeetingTimePlannerOptions;

export const ALIASES: Record<string, string> = {
  utc: "UTC", gmt: "UTC", mumbai: "Asia/Kolkata", delhi: "Asia/Kolkata", bangalore: "Asia/Kolkata", bengaluru: "Asia/Kolkata", pune: "Asia/Kolkata", chennai: "Asia/Kolkata", hyderabad: "Asia/Kolkata", kolkata: "Asia/Kolkata", ist: "Asia/Kolkata", india: "Asia/Kolkata",
  nyc: "America/New_York", "new york": "America/New_York", boston: "America/New_York", toronto: "America/Toronto", miami: "America/New_York", est: "America/New_York", et: "America/New_York",
  chicago: "America/Chicago", dallas: "America/Chicago", houston: "America/Chicago", cst: "America/Chicago", ct: "America/Chicago",
  denver: "America/Denver", phoenix: "America/Phoenix", mst: "America/Denver", mt: "America/Denver",
  sf: "America/Los_Angeles", "san francisco": "America/Los_Angeles", la: "America/Los_Angeles", "los angeles": "America/Los_Angeles", seattle: "America/Los_Angeles", pst: "America/Los_Angeles", pt: "America/Los_Angeles",
  vancouver: "America/Vancouver", "mexico city": "America/Mexico_City", "sao paulo": "America/Sao_Paulo", "buenos aires": "America/Argentina/Buenos_Aires", bogota: "America/Bogota", lima: "America/Lima",
  london: "Europe/London", dublin: "Europe/Dublin", lisbon: "Europe/Lisbon", uk: "Europe/London", bst: "Europe/London",
  paris: "Europe/Paris", berlin: "Europe/Berlin", madrid: "Europe/Madrid", rome: "Europe/Rome", amsterdam: "Europe/Amsterdam", zurich: "Europe/Zurich", vienna: "Europe/Vienna", stockholm: "Europe/Stockholm", warsaw: "Europe/Warsaw", prague: "Europe/Prague", cet: "Europe/Paris", cest: "Europe/Paris",
  athens: "Europe/Athens", helsinki: "Europe/Helsinki", kyiv: "Europe/Kyiv", istanbul: "Europe/Istanbul", moscow: "Europe/Moscow", cairo: "Africa/Cairo", johannesburg: "Africa/Johannesburg", nairobi: "Africa/Nairobi", lagos: "Africa/Lagos",
  dubai: "Asia/Dubai", riyadh: "Asia/Riyadh", tehran: "Asia/Tehran", karachi: "Asia/Karachi", dhaka: "Asia/Dhaka", colombo: "Asia/Colombo", kathmandu: "Asia/Kathmandu",
  bangkok: "Asia/Bangkok", jakarta: "Asia/Jakarta", singapore: "Asia/Singapore", "kuala lumpur": "Asia/Kuala_Lumpur", manila: "Asia/Manila", "hong kong": "Asia/Hong_Kong", shanghai: "Asia/Shanghai", beijing: "Asia/Shanghai", taipei: "Asia/Taipei", seoul: "Asia/Seoul", tokyo: "Asia/Tokyo", jst: "Asia/Tokyo",
  sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", brisbane: "Australia/Brisbane", perth: "Australia/Perth", adelaide: "Australia/Adelaide", auckland: "Pacific/Auckland", honolulu: "Pacific/Honolulu",
};

export interface Person {
  label: string;
  zone: string;
  start: number; // minutes after local midnight
  end: number;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function validZone(z: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    return true;
  } catch {
    return false;
  }
}

/** UTC offset in minutes of `zone` at the given instant. */
export function offsetAt(zone: string, ms: number): number {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const p: Record<string, number> = {};
  for (const part of dtf.formatToParts(new Date(ms))) if (part.type !== "literal") p[part.type] = Number(part.value);
  const asUtc = Date.UTC(p.year!, p.month! - 1, p.day!, p.hour! === 24 ? 0 : p.hour!, p.minute!, p.second!);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

export function localParts(zone: string, ms: number): { y: number; mo: number; d: number; minutes: number; dow: number; off: number } {
  const off = offsetAt(zone, ms);
  const dt = new Date(ms + off * 60000);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate(), minutes: dt.getUTCHours() * 60 + dt.getUTCMinutes(), dow: dt.getUTCDay(), off };
}

/** Instant (ms) of local midnight of y-m-d in zone. */
export function zonedMidnight(zone: string, y: number, mo: number, d: number): number {
  let guess = Date.UTC(y, mo - 1, d);
  for (let k = 0; k < 3; k++) {
    const off = offsetAt(zone, guess);
    guess = Date.UTC(y, mo - 1, d) - off * 60000;
  }
  return guess;
}

const fmtOff = (m: number) => `UTC${m < 0 ? "-" : "+"}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`;

export function parseHours(s: string): [number, number] {
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*$/i.exec(s);
  if (!m) throw new Error(`Hours "${s}" should look like 9-18 or 09:30-17:30`);
  const a = Number(m[1]) * 60 + Number(m[2] ?? 0);
  const b = Number(m[3]) * 60 + Number(m[4] ?? 0);
  if (a >= b) throw new Error(`Hours "${s}": the end must be after the start (overnight shifts are not supported)`);
  if (b > 1440 || Number(m[2] ?? 0) > 59 || Number(m[4] ?? 0) > 59) throw new Error(`Hours "${s}" are out of range`);
  return [a, b];
}

export function parsePeople(input: string, defaultHours: string): Person[] {
  const [ds, de] = parseHours(defaultHours);
  const people: Person[] = [];
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const parts = line.split("|").map((p) => p.trim());
    let label = "";
    let zoneTxt = "";
    let hours: string | undefined;
    if (parts.length === 1) zoneTxt = parts[0]!;
    else if (parts.length === 2) {
      if (/^\d{1,2}(:\d{2})?\s*(-|–|to)/i.test(parts[1]!)) [zoneTxt, hours] = [parts[0]!, parts[1]];
      else [label, zoneTxt] = [parts[0]!, parts[1]!];
    } else [label, zoneTxt, hours] = [parts[0]!, parts[1]!, parts[2]];
    const key = zoneTxt.toLowerCase();
    const zone = ALIASES[key] ?? (validZone(zoneTxt) ? zoneTxt : validZone(zoneTxt.replace(/ /g, "_")) ? zoneTxt.replace(/ /g, "_") : "");
    if (!zone) throw new Error(`Unknown time zone "${zoneTxt}": use an IANA name like Asia/Kolkata or a city like Mumbai`);
    const [s, e] = hours ? parseHours(hours) : [ds, de];
    people.push({ label: label || (ALIASES[key] ? zoneTxt.replace(/\b\w/g, (c) => c.toUpperCase()) : zone.split("/").pop()!.replace(/_/g, " ")), zone, start: s, end: e });
  }
  return people;
}

const WEEKEND: Record<Opts["weekend"], number[]> = { "sat-sun": [0, 6], "fri-sat": [5, 6], fri: [5], none: [] };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtClock(minutes: number, clock: Opts["clock"]): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  if (clock === "24") return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m % 60)}${h < 12 ? "am" : "pm"}`;
}

export interface Slot {
  ms: number;
  fits: boolean[];
  count: number;
}

export function computeSlots(people: Person[], anchorDate: { y: number; mo: number; d: number }, o: Opts): Slot[] {
  const step = Number(o.stepMinutes);
  const startMs = zonedMidnight(people[0]!.zone, anchorDate.y, anchorDate.mo, anchorDate.d);
  const out: Slot[] = [];
  const weekend = WEEKEND[o.weekend];
  for (let ms = startMs; ms < startMs + 24 * 3600000; ms += step * 60000) {
    const fits = people.map((p) => {
      const a = localParts(p.zone, ms);
      const b = localParts(p.zone, ms + o.meetingMinutes * 60000);
      if (weekend.includes(a.dow)) return false;
      if (a.d !== b.d && !(b.minutes === 0 && b.d !== a.d)) return false;
      const endMin = a.d === b.d ? b.minutes : 1440;
      return a.minutes >= p.start && endMin <= p.end;
    });
    out.push({ ms, fits, count: fits.filter(Boolean).length });
  }
  return out;
}

function parseDate(s: string): { y: number; mo: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) throw new Error(`Date "${s}" should look like 2026-11-03`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) throw new Error(`${s} is not a real date`);
  return { y, mo, d };
}

function showLocal(p: Person, ms: number, base: { y: number; mo: number; d: number }, clock: Opts["clock"]): string {
  const l = localParts(p.zone, ms);
  const dd = Math.round((Date.UTC(l.y, l.mo - 1, l.d) - Date.UTC(base.y, base.mo - 1, base.d)) / 86400000);
  return `${fmtClock(l.minutes, clock)}${dd === 0 ? "" : dd > 0 ? ` +${dd}d` : ` ${dd}d`}`;
}

export function meetingTimePlanner(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    date: options.date ?? "",
    meetingMinutes: options.meetingMinutes ?? 60,
    stepMinutes: options.stepMinutes ?? "30",
    hours: options.hours ?? "9-18",
    weekend: options.weekend ?? "sat-sun",
    view: options.view ?? "windows",
    clock: options.clock ?? "24",
    compromises: options.compromises ?? true,
  };
  if (input.trim() === "") return { output: "", error: null };
  try {
    const people = parsePeople(input, o.hours);
    if (people.length === 0) return { output: "", error: null };
    if (people.length > 24) throw new Error("Up to 24 participants");
    const today = new Date();
    const base = o.date.trim() ? parseDate(o.date) : (() => {
      const l = localParts(people[0]!.zone, today.getTime());
      return { y: l.y, mo: l.mo, d: l.d };
    })();
    const slots = computeSlots(people, base, o);
    const head: string[] = [];
    const a0 = localParts(people[0]!.zone, zonedMidnight(people[0]!.zone, base.y, base.mo, base.d));
    head.push(`${DOW[a0.dow]} ${base.y}-${pad(base.mo)}-${pad(base.d)} in ${people[0]!.label} (${people[0]!.zone}) · ${o.meetingMinutes}-minute meeting · weekends: ${o.weekend === "none" ? "ignored" : o.weekend}`);
    head.push("");
    const w = Math.max(...people.map((p) => p.label.length));
    const dayStart = zonedMidnight(people[0]!.zone, base.y, base.mo, base.d);
    for (const p of people) {
      const off0 = offsetAt(p.zone, dayStart);
      const off1 = offsetAt(p.zone, dayStart + 24 * 3600000);
      head.push(`  ${p.label.padEnd(w)}  ${fmtOff(off0)}  ${fmtClock(p.start, o.clock)}-${p.end === 1440 ? "24:00" : fmtClock(p.end, o.clock)}  ${p.zone}${off0 !== off1 ? `   ⚠ clocks change (${fmtOff(off0)} → ${fmtOff(off1)}) during this 24 h` : ""}`);
    }

    if (o.view === "grid") {
      const rows = ["", `Local time per hour (${people[0]!.label} hours down the side).  █ in working hours · ▒ within 1 h of them · · night/weekend`, ""];
      const lw = Math.max(5, people[0]!.label.length);
      rows.push(`${"".padEnd(lw)}  ${people.map((p) => p.label.slice(0, 7).padEnd(7)).join(" ")}`);
      for (let h = 0; h < 24; h++) {
        const ms = dayStart + h * 3600000;
        const cells = people.map((p) => {
          const l = localParts(p.zone, ms);
          const weekendDay = WEEKEND[o.weekend].includes(l.dow);
          const t = fmtClock(l.minutes, "24");
          const inH = !weekendDay && l.minutes >= p.start && l.minutes < p.end;
          const near = !weekendDay && !inH && l.minutes >= p.start - 60 && l.minutes < p.end + 60;
          return `${inH ? "█" : near ? "▒" : "·"}${t}${l.d !== a0.d || l.mo !== a0.mo ? "*" : " "}`.padEnd(7);
        });
        rows.push(`${fmtClock(h * 60, o.clock).padEnd(lw)}  ${cells.join(" ")}`);
      }
      rows.push("", "* = a different calendar day than the first column");
      return { output: [...head, ...rows].join("\n"), error: null };
    }

    const out = [...head, ""];
    const all = slots.filter((s) => s.count === people.length);
    // merge consecutive full-fit slots into windows of possible start times
    const step = Number(o.stepMinutes) * 60000;
    const windows: Array<[number, number]> = [];
    for (const s of all) {
      const last = windows.at(-1);
      if (last && s.ms - last[1] === step) last[1] = s.ms;
      else windows.push([s.ms, s.ms]);
    }
    if (windows.length) {
      out.push(`Everyone is in working hours – start between:`);
      for (const [a, b] of windows) {
        out.push(`  ${people.map((p) => `${p.label} ${showLocal(p, a, base, o.clock)}${a === b ? "" : `–${showLocal(p, b, base, o.clock)}`}`).join("  |  ")}`);
      }
    } else {
      out.push("No time fits everyone's working hours on this date.");
    }
    if (o.compromises && (windows.length === 0 || people.length > 2)) {
      const need = windows.length ? people.length - 1 : Math.max(...slots.map((s) => s.count));
      const best = slots.filter((s) => s.count === need && need < people.length && need > 0);
      if (best.length) {
        out.push("", `${windows.length ? "Almost-everyone" : "Closest"} options (${need} of ${people.length} in hours):`);
        const picked = best.filter((_, i) => i % Math.max(1, Math.ceil(best.length / 8)) === 0).slice(0, 8);
        for (const s of picked) {
          const outside = people.filter((_, i) => !s.fits[i]).map((p) => p.label);
          out.push(`  ${people.map((p, i) => `${p.label} ${showLocal(p, s.ms, base, o.clock)}${s.fits[i] ? "" : " ✗"}`).join("  |  ")}   (outside hours: ${outside.join(", ")})`);
        }
      }
    }
    return { output: out.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
