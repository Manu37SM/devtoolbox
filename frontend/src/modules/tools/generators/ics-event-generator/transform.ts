import type { TransformResult } from "@/lib/tool-transform";
import type { IcsEventGeneratorOptions } from "./schema";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding: max 75 octets per line, continuation lines start with one space. */
export function foldLine(line: string): string[] {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return [line];
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > limit) {
      out.push(out.length ? " " + cur : cur);
      cur = "";
      bytes = 0;
      limit = 74;
    }
    cur += ch;
    bytes += b;
  }
  out.push(out.length ? " " + cur : cur);
  return out;
}

export interface ParsedDate { y: number; mo: number; d: number; h: number; mi: number; s: number; utc: boolean; dateOnly: boolean }

export function parseWhen(text: string): ParsedDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(text.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (m[4] === undefined) return { y, mo, d, h: 0, mi: 0, s: 0, utc: false, dateOnly: true };
  const h = Number(m[4]), mi = Number(m[5]), s = Number(m[6] ?? 0);
  if (h > 23 || mi > 59 || s > 59) return null;
  if (!m[7]) return { y, mo, d, h, mi, s, utc: false, dateOnly: false };
  let ms = Date.UTC(y, mo - 1, d, h, mi, s);
  if (m[7].toUpperCase() !== "Z") {
    const sign = m[7][0] === "-" ? -1 : 1;
    const digits = m[7].slice(1).replace(":", "");
    ms -= sign * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2))) * 60_000;
  }
  const u = new Date(ms);
  return { y: u.getUTCFullYear(), mo: u.getUTCMonth() + 1, d: u.getUTCDate(), h: u.getUTCHours(), mi: u.getUTCMinutes(), s: u.getUTCSeconds(), utc: true, dateOnly: false };
}

const fmtDate = (p: ParsedDate) => `${pad(p.y, 4)}${pad(p.mo)}${pad(p.d)}`;
const fmtDateTime = (p: ParsedDate) => `${fmtDate(p)}T${pad(p.h)}${pad(p.mi)}${pad(p.s)}${p.utc ? "Z" : ""}`;

function addMs(p: ParsedDate, ms: number): ParsedDate {
  const base = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) + ms;
  const u = new Date(base);
  return { y: u.getUTCFullYear(), mo: u.getUTCMonth() + 1, d: u.getUTCDate(), h: u.getUTCHours(), mi: u.getUTCMinutes(), s: u.getUTCSeconds(), utc: p.utc, dateOnly: p.dateOnly };
}

function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

const ALARM: Record<string, string> = { "5m": "-PT5M", "15m": "-PT15M", "1h": "-PT1H", "1d": "-P1D" };
const FREQ: Record<string, string> = { daily: "DAILY", weekly: "WEEKLY", monthly: "MONTHLY", yearly: "YEARLY" };
const KEY_ALIASES: Record<string, string> = { title: "summary", name: "summary", summary: "summary", start: "start", begin: "start", end: "end", finish: "end", location: "location", where: "location", description: "description", notes: "description", url: "url", link: "url" };

export function generateIcs(input: string, options: IcsEventGeneratorOptions, now: Date = new Date()): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const blocks = input.split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean);
  const stamp = fmtDateTime({ y: now.getUTCFullYear(), mo: now.getUTCMonth() + 1, d: now.getUTCDate(), h: now.getUTCHours(), mi: now.getUTCMinutes(), s: now.getUTCSeconds(), utc: true, dateOnly: false });
  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//DevToolbox//ICS Event Generator//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  for (const [bi, block] of blocks.entries()) {
    const f: Record<string, string> = {};
    for (const raw of block.split(/\r?\n/)) {
      const m = /^([A-Za-z]+)\s*[:=]\s*(.*)$/.exec(raw.trim());
      if (!m) return { output: "", error: { message: `Event ${bi + 1}: cannot read line "${raw.trim()}" (use "key: value")` } };
      const key = KEY_ALIASES[m[1]!.toLowerCase()];
      if (!key) return { output: "", error: { message: `Event ${bi + 1}: unknown field "${m[1]}" (use title, start, end, location, description, url)` } };
      f[key] = m[2]!.trim();
    }
    if (!f.summary) return { output: "", error: { message: `Event ${bi + 1}: title is required` } };
    if (!f.start) return { output: "", error: { message: `Event ${bi + 1}: start is required (e.g. 2026-11-05 14:30)` } };
    const start = parseWhen(f.start);
    if (!start) return { output: "", error: { message: `Event ${bi + 1}: cannot parse start "${f.start}" — use YYYY-MM-DD or YYYY-MM-DD HH:MM[:SS][Z|±HH:MM]` } };
    let end = f.end ? parseWhen(f.end) : null;
    if (f.end && !end) return { output: "", error: { message: `Event ${bi + 1}: cannot parse end "${f.end}"` } };
    lines.push("BEGIN:VEVENT", `UID:${hash(f.summary + f.start + (f.end ?? ""))}${hash(String(bi) + f.summary)}@devtoolbox`, `DTSTAMP:${stamp}`);
    if (options.allDay || start.dateOnly) {
      const endExclusive = addMs(end ?? start, 86_400_000);
      if (end && Date.UTC(end.y, end.mo - 1, end.d) < Date.UTC(start.y, start.mo - 1, start.d)) return { output: "", error: { message: `Event ${bi + 1}: end is before start` } };
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(start)}`, `DTEND;VALUE=DATE:${fmtDate(endExclusive)}`);
    } else {
      end = end ?? addMs(start, 3_600_000);
      const toMs = (p: ParsedDate) => Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
      if (toMs(end) < toMs(start) && start.utc === end.utc) return { output: "", error: { message: `Event ${bi + 1}: end is before start` } };
      lines.push(`DTSTART:${fmtDateTime(start)}`, `DTEND:${fmtDateTime(end)}`);
    }
    lines.push(`SUMMARY:${escapeText(f.summary)}`);
    if (f.location) lines.push(`LOCATION:${escapeText(f.location)}`);
    if (f.description) lines.push(`DESCRIPTION:${escapeText(f.description)}`);
    if (f.url) lines.push(`URL:${f.url}`);
    if (options.repeat !== "none") lines.push(`RRULE:FREQ=${FREQ[options.repeat]}${options.repeatCount > 0 ? `;COUNT=${options.repeatCount}` : ""}`);
    if (options.alarm !== "none") lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(f.summary)}`, `TRIGGER:${ALARM[options.alarm]}`, "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return { output: lines.flatMap(foldLine).join("\r\n") + "\r\n", error: null };
}
