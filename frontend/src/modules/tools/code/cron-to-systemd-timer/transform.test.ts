import { describe, expect, it } from "vitest";
import { convertCronToSystemd, cronToOnCalendar } from "./transform";

// Every pair below was checked by running the next 12 firing times through
// croniter (cron) and systemd-analyze calendar (systemd): they were identical.
const VERIFIED: [string, string][] = [
  ["*/5 * * * *", "*-*-* *:00/5:00"],
  ["0 2 * * *", "*-*-* 02:00:00"],
  ["30 9 * * 1-5", "Mon..Fri *-*-* 09:30:00"],
  ["0 0 1 * *", "*-*-01 00:00:00"],
  ["15 10,22 * * mon,fri", "Mon,Fri *-*-* 10,22:15:00"],
  ["0 */2 * * *", "*-*-* 00/2:00:00"],
  ["5-59/15 8 * * *", "*-*-* 08:05/15:00"],
  ["0 0 * * 0", "Sun *-*-* 00:00:00"],
  ["0 9 15 jan,jul *", "*-01,07-15 09:00:00"],
  ["*/10 9-17 * * 1-5", "Mon..Fri *-*-* 09..17:00/10:00"],
  ["0 12 1-7 * *", "*-*-01..07 12:00:00"],
  ["@hourly", "*-*-* *:00:00"],
  ["0 0 * * 7", "Sun *-*-* 00:00:00"],
  ["23 0-20/2 * * *", "*-*-* 00,02,04,06,08,10,12,14,16,18,20:23:00"],
  ["0 0 29 2 *", "*-02-29 00:00:00"],
  ["0 6 * * 1,3,5", "Mon,Wed,Fri *-*-* 06:00:00"],
  ["0 6 * * 6,0", "Sun,Sat *-*-* 06:00:00"],
  ["45 3 1,15 * *", "*-*-01,15 03:45:00"],
];

describe("cronToOnCalendar", () => {
  it.each(VERIFIED)("%s -> %s", (cron, calendar) => {
    expect(cronToOnCalendar(cron).value).toBe(calendar);
  });
  it("appends a timezone", () => {
    expect(cronToOnCalendar("0 2 * * *", "Asia/Kolkata").value).toBe("*-*-* 02:00:00 Asia/Kolkata");
  });
  it("warns about cron's OR rule for day-of-month plus weekday", () => {
    const r = cronToOnCalendar("0 0 1 * 1");
    expect(r.value).toBe("Mon *-*-* 00:00:00");
    expect(r.notes[0]).toMatch(/EITHER/);
  });
  it("rejects what cannot be converted", () => {
    expect(() => cronToOnCalendar("@reboot")).toThrow(/OnBootSec/);
    expect(() => cronToOnCalendar("* * * *")).toThrow(/5 fields/);
    expect(() => cronToOnCalendar("0 0 0 * * *")).toThrow(/seconds/);
    expect(() => cronToOnCalendar("61 * * * *")).toThrow(/minute/);
    expect(() => cronToOnCalendar("* 5-2 * * *")).toThrow(/backwards/);
    expect(() => cronToOnCalendar("*/0 * * * *")).toThrow(/step/);
  });
});

describe("convertCronToSystemd", () => {
  it("writes both units with the chosen options", () => {
    const r = convertCronToSystemd("0 2 * * *", { unitName: "nightly backup", command: "/opt/b.sh --full", user: "backup", randomizedDelaySec: 300 });
    expect(r.error).toBeNull();
    expect(r.output).toContain("# /etc/systemd/system/nightly-backup.timer");
    expect(r.output).toContain("OnCalendar=*-*-* 02:00:00");
    expect(r.output).toContain("Persistent=true");
    expect(r.output).toContain("RandomizedDelaySec=300");
    expect(r.output).toContain("User=backup");
    expect(r.output).toContain("ExecStart=/opt/b.sh --full");
    expect(r.output).toContain("systemctl enable --now nightly-backup.timer");
  });
  it("can omit persistence and output just OnCalendar", () => {
    expect(convertCronToSystemd("0 2 * * *", { persistent: false }).output).not.toContain("Persistent");
    expect(convertCronToSystemd("*/15 * * * *", { output: "oncalendar" }).output).toBe("OnCalendar=*-*-* *:00/15:00");
  });
  it("reports errors and empty input", () => {
    expect(convertCronToSystemd("nonsense", {}).error).not.toBeNull();
    expect(convertCronToSystemd(" ", {})).toEqual({ output: "", error: null });
  });
});
