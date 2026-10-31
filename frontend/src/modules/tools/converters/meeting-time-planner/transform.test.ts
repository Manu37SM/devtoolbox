import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { localParts, meetingTimePlanner, offsetAt, parseHours, parsePeople, zonedMidnight } from "./transform";

let available = false;
try {
  execFileSync("python3", ["-c", "import zoneinfo; zoneinfo.ZoneInfo('Asia/Kolkata')"], { stdio: "pipe" });
  available = true;
} catch {
  available = false;
}

const run = (input: string, o: Parameters<typeof meetingTimePlanner>[1] = {}) => meetingTimePlanner(input, { date: "2026-11-03", ...o });

describe("parsing", () => {
  it("parses hours", () => {
    expect(parseHours("9-18")).toEqual([540, 1080]);
    expect(parseHours("09:30 to 17:30")).toEqual([570, 1050]);
    expect(() => parseHours("18-9")).toThrow();
    expect(() => parseHours("abc")).toThrow();
  });
  it("accepts cities, IANA names, labels and per-person hours", () => {
    const p = parsePeople("Asha | Mumbai\nBen | America/New_York | 8-16\nTokyo\nLondon | 10-19", "9-18");
    expect(p.map((x) => x.zone)).toEqual(["Asia/Kolkata", "America/New_York", "Asia/Tokyo", "Europe/London"]);
    expect(p[1]).toMatchObject({ label: "Ben", start: 480, end: 960 });
    expect(p[3]).toMatchObject({ start: 600, end: 1140 });
  });
  it("rejects unknown zones", () => {
    expect(run("Atlantis").error?.message).toMatch(/Unknown time zone/);
  });
});

describe("offsets", () => {
  it("handles DST", () => {
    expect(offsetAt("America/New_York", Date.UTC(2026, 6, 1))).toBe(-240);
    expect(offsetAt("America/New_York", Date.UTC(2026, 11, 1))).toBe(-300);
    expect(offsetAt("Asia/Kolkata", Date.UTC(2026, 6, 1))).toBe(330);
    expect(offsetAt("Asia/Kathmandu", Date.UTC(2026, 6, 1))).toBe(345);
  });
  it("zonedMidnight round-trips", () => {
    const ms = zonedMidnight("America/New_York", 2026, 11, 1); // DST ends that day
    const l = localParts("America/New_York", ms);
    expect([l.y, l.mo, l.d, l.minutes]).toEqual([2026, 11, 1, 0]);
  });
});

describe("planning", () => {
  it("finds the India / New York overlap", () => {
    // 2026-11-03: NY is UTC-5, IST +5:30 => 10.5 h apart. 9-18 IST = 22:30-07:30 NY(prev day): no overlap with 9-18 NY
    const r = run("Asha | Mumbai\nBen | New York");
    expect(r.output).toMatch(/No time fits/);
  });
  it("finds a London / Paris overlap (start 09:00–16:00 London for a 60-min meeting)", () => {
    const r = run("London\nParis", { hours: "9-18" });
    expect(r.output).toMatch(/Everyone is in working hours/);
    expect(r.output).toContain("London 09:00–16:00  |  Paris 10:00–17:00");
  });
  it("skips weekends", () => {
    const r = run("London\nParis", { date: "2026-11-07" });
    expect(r.output).toMatch(/No time fits/);
    const r2 = run("London\nParis", { date: "2026-11-07", weekend: "none" });
    expect(r2.output).toMatch(/Everyone is in working hours/);
  });
  it("supports a Friday-Saturday weekend", () => {
    const r = run("Dubai\nLondon", { date: "2026-11-06", weekend: "fri-sat" });
    expect(r.output).toMatch(/No time fits/);
  });
  it("offers compromises when nothing fits", () => {
    const r = run("Mumbai\nNew York\nTokyo", { compromises: true });
    expect(r.output).toMatch(/Closest options/);
  });
  it("flags DST changes inside the day", () => {
    const r = run("New York\nLondon", { date: "2026-11-01" });
    expect(r.output).toMatch(/clocks change/);
  });
  it("grid view lists 24 hours", () => {
    const r = run("London\nTokyo", { view: "grid" });
    expect(r.output.split("\n").filter((l) => /^\d\d:00 /.test(l)).length).toBe(24);
  });
  it("12 hour clock", () => {
    const r = run("London\nParis", { clock: "12" });
    expect(r.output).toMatch(/\d:\d\d(am|pm)/);
  });
  it("rejects bad dates and empty input", () => {
    expect(run("London", { date: "2026-02-30" }).error).not.toBeNull();
    expect(run("").output).toBe("");
  });
});

describe.skipIf(!available)("zoneinfo oracle", () => {
  it("matches Python for offsets across zones and instants", () => {
    const zones = ["America/New_York", "Europe/London", "Asia/Kolkata", "Australia/Sydney", "Asia/Kathmandu", "Pacific/Auckland", "America/Sao_Paulo", "Africa/Cairo", "Europe/Istanbul", "America/St_Johns", "Pacific/Chatham", "Australia/Lord_Howe"];
    const instants: number[] = [];
    for (let m = 0; m < 24; m++) instants.push(Date.UTC(2026, m, 3, 12), Date.UTC(2026, m, 28, 3));
    // around transitions
    for (const d of [Date.UTC(2026, 2, 8, 6, 59), Date.UTC(2026, 2, 8, 7, 1), Date.UTC(2026, 10, 1, 5, 59), Date.UTC(2026, 10, 1, 6, 1), Date.UTC(2026, 2, 29, 0, 59), Date.UTC(2026, 2, 29, 1, 1)]) instants.push(d);
    const script = `
import sys, json
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
zones, inst = json.load(sys.stdin)
out = {}
for z in zones:
    tz = ZoneInfo(z)
    out[z] = [int(datetime.fromtimestamp(ms/1000, tz).utcoffset().total_seconds()//60) for ms in inst]
print(json.dumps(out))`;
    const res = JSON.parse(execFileSync("python3", ["-c", script], { input: JSON.stringify([zones, instants]), encoding: "utf8" })) as Record<string, number[]>;
    for (const z of zones) instants.forEach((ms, i) => expect(offsetAt(z, ms), `${z} @ ${new Date(ms).toISOString()}`).toBe(res[z]![i]));
  });

  it("every reported full-fit slot really is inside each person's hours (Python check)", () => {
    const people = "A | Europe/London\nB | Asia/Kolkata | 10-19\nC | Asia/Dubai | 8-17";
    const r = run(people, { date: "2026-11-03", stepMinutes: "15", meetingMinutes: 45 });
    const m = /start between:\n([\s\S]*?)(\n\n|$)/.exec(r.output);
    expect(m).not.toBeNull();
    const line = m![1]!.split("\n")[0]!;
    // pull "A hh:mm–hh:mm" start/end for A, convert via python and check B and C windows
    const a = /A (\d\d):(\d\d)(?:–(\d\d):(\d\d))?/.exec(line)!;
    const startA = Number(a[1]) * 60 + Number(a[2]);
    const endA = a[3] ? Number(a[3]) * 60 + Number(a[4]) : startA;
    const script = `
import sys, json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
s, e = json.load(sys.stdin)
base = datetime(2026,11,3,tzinfo=ZoneInfo('Europe/London'))
ok = True
for mins in range(s, e+1, 15):
    t = base + timedelta(minutes=mins)
    end = t + timedelta(minutes=45)
    for z,(h0,h1) in {'Europe/London':(540,1080),'Asia/Kolkata':(600,1140),'Asia/Dubai':(480,1020)}.items():
        a = t.astimezone(ZoneInfo(z)); b = end.astimezone(ZoneInfo(z))
        if a.date()!=b.date(): ok=False
        if not (h0 <= a.hour*60+a.minute and b.hour*60+b.minute <= h1): ok=False
print(ok)`;
    expect(execFileSync("python3", ["-c", script], { input: JSON.stringify([startA, endA]), encoding: "utf8" }).trim()).toBe("True");
  });
});
