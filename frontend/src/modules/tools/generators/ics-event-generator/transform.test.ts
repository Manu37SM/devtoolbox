import { describe, expect, it } from "vitest";
import { escapeText, foldLine, generateIcs, parseWhen } from "./transform";

const NOW = new Date("2026-01-02T03:04:05Z");
const o = { allDay: false, alarm: "none", repeat: "none", repeatCount: 0 } as const;
const unfold = (s: string) => s.replace(/\r\n /g, "");

describe("helpers", () => {
  it("escapes text per RFC 5545", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
  });
  it("folds long lines at 75 octets without splitting characters", () => {
    const line = "DESCRIPTION:" + "é".repeat(60);
    const folded = foldLine(line);
    expect(folded.length).toBeGreaterThan(1);
    for (const l of folded) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(folded.map((l, i) => (i ? l.slice(1) : l)).join("")).toBe(line);
    expect(foldLine("short")).toEqual(["short"]);
  });
  it("parses dates with offsets into UTC", () => {
    expect(parseWhen("2026-11-05 14:30")).toMatchObject({ h: 14, mi: 30, utc: false });
    expect(parseWhen("2026-11-05T14:30:00+05:30")).toMatchObject({ y: 2026, mo: 11, d: 5, h: 9, mi: 0, utc: true });
    expect(parseWhen("2026-11-05T00:30:00+05:30")).toMatchObject({ d: 4, h: 19, mi: 0, utc: true });
    expect(parseWhen("2026-11-05")).toMatchObject({ dateOnly: true });
    expect(parseWhen("tomorrow")).toBeNull();
    expect(parseWhen("2026-13-01")).toBeNull();
  });
});

describe("generateIcs", () => {
  it("creates a timed event with CRLF endings and defaults end to +1h", () => {
    const r = generateIcs("title: Team sync, weekly\nstart: 2026-11-05 14:30\nlocation: Room 4; HQ", o, NOW);
    expect(r.error).toBeNull();
    const t = unfold(r.output);
    expect(t.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(t).toContain("DTSTART:20261105T143000\r\n");
    expect(t).toContain("DTEND:20261105T153000\r\n");
    expect(t).toContain("SUMMARY:Team sync\\, weekly");
    expect(t).toContain("LOCATION:Room 4\\; HQ");
    expect(t).toContain("DTSTAMP:20260102T030405Z");
    expect(t.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(r.output.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });
  it("handles UTC conversion, all-day events (inclusive end), alarms and recurrence", () => {
    const utc = generateIcs("title: X\nstart: 2026-11-05T14:30:00+05:30\nend: 2026-11-05T16:00:00+05:30", o, NOW).output;
    expect(utc).toContain("DTSTART:20261105T090000Z");
    expect(utc).toContain("DTEND:20261105T103000Z");
    const day = generateIcs("title: Trip\nstart: 2026-12-30\nend: 2027-01-02", o, NOW).output;
    expect(day).toContain("DTSTART;VALUE=DATE:20261230");
    expect(day).toContain("DTEND;VALUE=DATE:20270103");
    const rec = generateIcs("title: Gym\nstart: 2026-11-05 07:00", { ...o, alarm: "1h", repeat: "weekly", repeatCount: 10 }, NOW).output;
    expect(rec).toContain("RRULE:FREQ=WEEKLY;COUNT=10");
    expect(rec).toContain("TRIGGER:-PT1H");
  });
  it("supports several events separated by a blank line and gives stable UIDs", () => {
    const text = "title: A\nstart: 2026-11-05 10:00\n\ntitle: B\nstart: 2026-11-06 10:00";
    const a = generateIcs(text, o, NOW).output;
    expect((a.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
    expect(generateIcs(text, o, new Date()).output.match(/UID:[^\r]+/g)).toEqual(a.match(/UID:[^\r]+/g));
    expect(new Set(a.match(/UID:[^\r]+/g)).size).toBe(2);
  });
  it("reports clear errors", () => {
    expect(generateIcs("start: 2026-11-05", o, NOW).error?.message).toContain("title is required");
    expect(generateIcs("title: A", o, NOW).error?.message).toContain("start is required");
    expect(generateIcs("title: A\nstart: soon", o, NOW).error?.message).toContain("cannot parse start");
    expect(generateIcs("title: A\nstart: 2026-11-05 10:00\nend: 2026-11-05 09:00", o, NOW).error?.message).toContain("before start");
    expect(generateIcs("title: A\nbogus: 1\nstart: 2026-11-05", o, NOW).error?.message).toContain("unknown field");
  });
});
