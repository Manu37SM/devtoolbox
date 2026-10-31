import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fromJdn, julianDateConverter, parseLine, toJdn, validate, weekday } from "./transform";

const O = { inputFormat: "auto", output: "table", pivotStart: 1970, dateStyle: "iso" } as const;
const one = (line: string, output: Parameters<typeof julianDateConverter>[1] = {}) => {
  const r = julianDateConverter(line, { ...output });
  if (r.error) throw new Error(r.error.message);
  return r.output;
};

describe("Meeus, Astronomical Algorithms (worked examples)", () => {
  // [calendar, y, m, d(with fraction), JD]
  const cases: Array<["g" | "j", number, number, number, number]> = [
    ["g", 2000, 1, 1.5, 2451545.0],
    ["g", 1987, 1, 27.0, 2446822.5],
    ["g", 1987, 6, 19.5, 2446966.0],
    ["g", 1988, 1, 27.0, 2447187.5],
    ["g", 1988, 6, 19.5, 2447332.0],
    ["g", 1900, 1, 1.0, 2415020.5],
    ["g", 1600, 1, 1.0, 2305447.5],
    ["g", 1600, 12, 31.0, 2305812.5],
    ["j", 837, 4, 10.3, 2026871.8],
    ["j", -123, 12, 31.0, 1676496.5],
    ["j", -122, 1, 1.0, 1676497.5],
    ["j", -1000, 7, 12.5, 1356001.0],
    ["j", -1000, 2, 29.0, 1355866.5],
    ["j", -1001, 8, 17.9, 1355671.4],
    ["j", -4712, 1, 1.5, 0.0],
    ["j", 333, 1, 27.5, 1842713.0],
    ["g", 1957, 10, 4.81, 2436116.31],
  ];
  for (const [cal, y, m, d, jd] of cases) {
    it(`${cal === "g" ? "Gregorian" : "Julian"} ${y}-${m}-${d} = JD ${jd}`, () => {
      const day = Math.floor(d);
      const computed = toJdn({ y, m, d: day }, cal) - 0.5 + (d - day);
      expect(computed).toBeCloseTo(jd, 6);
      expect(fromJdn(toJdn({ y, m, d: day }, cal), cal)).toEqual({ y, m, d: day });
    });
  }
});

describe("parsing", () => {
  const g = (s: string, f: Parameters<typeof parseLine>[1] = "auto") => fromJdn(parseLine(s, f, O).jdn, "g");
  it("gregorian forms", () => {
    expect(g("2024-05-03")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("03/05/2024")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("20240503")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("2024/5/3")).toEqual({ y: 2024, m: 5, d: 3 });
  });
  it("ordinal / YYDDD / CYYDDD", () => {
    expect(g("2024-124")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("2024124")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("24124")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("124124")).toEqual({ y: 2024, m: 5, d: 3 });
    expect(g("99365")).toEqual({ y: 1999, m: 12, d: 31 });
    expect(g("100001")).toEqual({ y: 2000, m: 1, d: 1 });
    expect(g("24366")).toEqual({ y: 2024, m: 12, d: 31 }); // leap year
  });
  it("two-digit year pivot", () => {
    expect(fromJdn(parseLine("69001", "auto", { ...O, pivotStart: 1970 }).jdn, "g").y).toBe(2069);
    expect(fromJdn(parseLine("70001", "auto", { ...O, pivotStart: 1970 }).jdn, "g").y).toBe(1970);
    expect(fromJdn(parseLine("30001", "auto", { ...O, pivotStart: 1930 }).jdn, "g").y).toBe(1930);
  });
  it("JD, MJD, Lilian, Rata Die, Excel", () => {
    expect(parseLine("2460434.5", "auto", O)).toMatchObject({ jdn: 2460435, frac: 0 });
    expect(g("jd 2451545")).toEqual({ y: 2000, m: 1, d: 1 });
    expect(parseLine("JD 2451545", "auto", O).frac).toBeCloseTo(0.5);
    expect(g("mjd 51544")).toEqual({ y: 2000, m: 1, d: 1 });
    expect(g("lilian 1")).toEqual({ y: 1582, m: 10, d: 15 });
    expect(g("rd 1")).toEqual({ y: 1, m: 1, d: 1 });
    expect(g("45000", "excel1900")).toEqual({ y: 2023, m: 3, d: 15 });
    expect(g("1", "excel1900")).toEqual({ y: 1900, m: 1, d: 1 });
    expect(g("59", "excel1900")).toEqual({ y: 1900, m: 2, d: 28 });
    expect(g("61", "excel1900")).toEqual({ y: 1900, m: 3, d: 1 });
    expect(g("0", "excel1904")).toEqual({ y: 1904, m: 1, d: 1 });
  });
  it("7-digit ambiguity prefers YYYYDDD only when valid", () => {
    expect(g("2024001")).toEqual({ y: 2024, m: 1, d: 1 });
    expect(g("2460434").y).toBe(2024); // a JDN, since 'day 434' isn't valid
  });
  it("Julian-calendar input", () => {
    expect(g("julian: 1582-10-04")).toEqual({ y: 1582, m: 10, d: 14 });
    expect(g("1582-10-05", "julian-calendar")).toEqual({ y: 1582, m: 10, d: 15 });
    expect(g("os: 1700-02-29")).toEqual({ y: 1700, m: 3, d: 11 });
  });
  it("rejects bad input", () => {
    expect(() => parseLine("2023-02-29", "auto", O)).toThrow(/no day 29/);
    expect(() => parseLine("2023-13-01", "auto", O)).toThrow(/month 13/);
    expect(() => parseLine("23366", "auto", O)).toThrow(/out of range/);
    expect(() => parseLine("60", "excel1900", O)).toThrow(/1900-02-29/);
    expect(() => parseLine("abc", "auto", O)).toThrow();
    expect(validate({ y: 1900, m: 2, d: 29 }, "j")).toBeNull(); // 1900 is a Julian leap year
    expect(validate({ y: 1900, m: 2, d: 29 }, "g")).not.toBeNull();
  });
});

describe("output", () => {
  it("table for a date", () => {
    const t = one("2024-05-03");
    expect(t).toMatch(/Gregorian\s+2024-05-03 {2}\(Friday\)/);
    expect(t).toMatch(/Julian calendar\s+2024-04-20 {3}\(Gregorian is 13 days ahead\)/);
    expect(one("1582-10-15")).toMatch(/Julian calendar\s+1582-10-05 {3}\(Gregorian is 10 days ahead\)/);
    expect(t).toMatch(/Ordinal \(ISO\)\s+2024-124/);
    expect(t).toMatch(/YYDDD\s+24124/);
    expect(t).toMatch(/CYYDDD \(JD Edwards\)\s+124124/);
    expect(t).toMatch(/Julian Day \(JD, from midnight\)\s+2460433.5/);
    expect(t).toMatch(/Modified JD\s+60433/);
    expect(t).toMatch(/Excel 1900 serial\s+45415/);
    expect(t).toMatch(/Days since 1970-01-01\s+19846/);
  });
  it("time of day from fractional JD", () => {
    expect(one("2451545.25")).toMatch(/Time\s+18:00:00 UTC/);
  });
  it("pre-reform warning", () => {
    expect(one("1500-03-01")).toMatch(/proleptic/);
  });
  it("single-format batch output", () => {
    const r = one("2024-05-03\n99365\n# c\n124001", { output: "gregorian" });
    expect(r).toBe("2024-05-03\t2024-05-03\n99365\t1999-12-31\n124001\t2024-01-01");
    expect(one("24124", { output: "cyyddd" })).toBe("124124");
    expect(one("2024-05-03", { output: "weekday" })).toBe("Friday");
  });
  it("per-line errors in batch mode, hard error for one line", () => {
    expect(one("2024-05-03\nnope", { output: "jdn" })).toContain("nope\t! ");
    expect(julianDateConverter("nope").error).not.toBeNull();
    expect(julianDateConverter("").output).toBe("");
  });
  it("date styles", () => {
    expect(one("2024-05-03", { output: "gregorian", dateStyle: "dmy" })).toBe("03/05/2024");
    expect(one("2024-05-03", { output: "gregorian", dateStyle: "long" })).toBe("3 May 2024");
    expect(one("-0043-03-15", { output: "gregorian", dateStyle: "long" })).toBe("15 March 44 BC");
  });
  it("weekdays", () => {
    expect(weekday(toJdn({ y: 2000, m: 1, d: 1 }, "g"))).toBe("Saturday");
    expect(weekday(toJdn({ y: 1582, m: 10, d: 15 }, "g"))).toBe("Friday");
  });
});

// ---- oracles: Python datetime (Gregorian) and convertdate (Julian calendar) ----
const py = (code: string) => spawnSync("python3", ["-c", code], { encoding: "utf8" });
const hasDatetime = py("import datetime").status === 0;
const hasConvertdate = py("import convertdate").status === 0;

describe.skipIf(!hasDatetime)("python datetime oracle", () => {
  it("JDN, Rata Die and weekday agree for every 7th day over 1-9999", () => {
    const r = py(`
import datetime, json
out=[]
d=datetime.date(1,1,1)
while d.year<9999:
    out.append([d.year,d.month,d.day,d.toordinal(),d.weekday()])
    d+=datetime.timedelta(days=7*13+3)
print(json.dumps(out))`);
    const rows = JSON.parse(r.stdout) as number[][];
    expect(rows.length).toBeGreaterThan(900);
    for (const [y, m, d, ord, wd] of rows) {
      const jdn = toJdn({ y: y!, m: m!, d: d! }, "g");
      expect(jdn - 1721425, `${y}-${m}-${d}`).toBe(ord);
      expect(fromJdn(jdn, "g")).toEqual({ y, m, d });
      // python Monday=0; ours returns the name
      expect(weekday(jdn)).toBe(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][wd!]);
    }
  });
  it("YYYY-DDD and Excel serials agree with datetime", () => {
    const r = py(`
import datetime, json
out=[]
for y in (1900,1904,1999,2000,2023,2024,2100):
    for doy in (1,59,60,61,100,365):
        d=datetime.date(y,1,1)+datetime.timedelta(days=doy-1)
        out.append([y,doy,d.isoformat(),(d-datetime.date(1899,12,30)).days,(d-datetime.date(1904,1,1)).days])
print(json.dumps(out))`);
    for (const [y, doy, iso, serial, s1904] of JSON.parse(r.stdout) as Array<[number, number, string, number, number]>) {
      expect(one(`${y}-${String(doy).padStart(3, "0")}`, { output: "gregorian" }), `${y}-${doy}`).toBe(iso);
      if (iso >= "1900-03-01") expect(one(iso, { output: "excel1900" })).toBe(String(serial));
      if (iso >= "1904-01-01") {
        expect(one(iso, { output: "excel1904" })).toBe(String(s1904));
        expect(one(String(s1904), { inputFormat: "excel1904", output: "gregorian" })).toBe(iso);
      }
    }
  });
});

describe.skipIf(!hasConvertdate)("convertdate oracle (Julian calendar)", () => {
  it("Julian ↔ Gregorian agree over 4000 BC - 3000 AD", () => {
    const r = py(`
import json
from convertdate import julian, gregorian
out=[]
for y in range(-4000,3001,37):
    for m,d in ((1,1),(2,28),(3,1),(7,15),(12,31)):
        jd=julian.to_jd(y,m,d)
        g=gregorian.from_jd(jd)
        out.append([y,m,d,jd,list(g)])
print(json.dumps(out))`);
    const rows = JSON.parse(r.stdout) as Array<[number, number, number, number, number[]]>;
    expect(rows.length).toBeGreaterThan(900);
    for (const [y, m, d, jd, g] of rows) {
      const jdn = toJdn({ y, m, d }, "j");
      expect(jdn - 0.5, `julian ${y}-${m}-${d}`).toBe(jd);
      expect(fromJdn(jdn, "g"), `gregorian of julian ${y}-${m}-${d}`).toEqual({ y: g[0], m: g[1], d: g[2] });
      expect(fromJdn(jdn, "j")).toEqual({ y, m, d });
    }
  });
});
