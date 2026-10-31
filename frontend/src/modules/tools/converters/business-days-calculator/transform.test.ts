import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { addBusinessDays, businessDaysCalculator as calc, countBusinessDays, fmtDay, parseDay, WEEKENDS } from "./transform";

const run = (input: string, o: Parameters<typeof calc>[1] = {}) => calc(input, o);

describe("business days", () => {
  it("adds across a weekend", () => {
    expect(run("2026-10-30", { days: 1 }).output).toContain("= 2026-11-02 Mon");
    expect(run("2026-10-30", { days: 5 }).output).toContain("= 2026-11-06 Fri");
  });
  it("subtracts and starts from a weekend like Excel WORKDAY", () => {
    expect(run("2026-10-31", { days: 1 }).output).toContain("= 2026-11-02 Mon");
    expect(run("2026-10-31", { days: -1 }).output).toContain("= 2026-10-30 Fri");
  });
  it("holidays and ranges", () => {
    const out = run("2026-12-23\nholiday 2026-12-24..2026-12-26, 2026-12-31", { days: 2 }).output;
    expect(out).toContain("= 2026-12-29 Tue");
    expect(out).toContain("(holiday)");
  });
  it("Middle-East weekend", () => {
    expect(run("2026-10-28", { days: 2, weekend: "fri-sat" }).output).toContain("= 2026-11-01 Sun"); // Wed→Thu→(Fri,Sat skipped)→Sun
  });
  it("counts inclusive and exclusive", () => {
    expect(run("2026-10-26\n2026-10-30", { mode: "count" }).output).toContain("Business days: 5");
    expect(run("2026-10-26\n2026-10-30", { mode: "count", inclusiveEnd: false }).output).toContain("Business days: 4");
    expect(run("2026-10-30\n2026-10-26", { mode: "count" }).output).toContain("Business days: -5");
  });
  it("lists and describes", () => {
    expect(run("2026-10-30\n2026-11-03", { mode: "list" }).output).toContain("3 business days");
    expect(run("2026-10-31", { mode: "info" }).output).toContain("Type: weekend");
  });
  it("errors", () => {
    expect(run("2026-02-30").error).not.toBeNull();
    expect(run("hello").error).not.toBeNull();
    expect(run("2026-10-30", { mode: "count" }).error).not.toBeNull();
    expect(run("2026-10-30\nholiday 2026-12-05..2026-12-01").error).not.toBeNull();
  });
});

// Oracle: numpy.busday_offset / busday_count
const np = spawnSync("python3", ["-c", "import numpy"], { encoding: "utf8" }).status === 0;
describe.skipIf(!np)("matches numpy", () => {
  // numpy weekmask is Monday..Sunday, 1 = open
  const masks: Record<string, string> = { "sat-sun": "1111100", "fri-sat": "1111001", "thu-fri": "1110011", fri: "1111011", sat: "1111101", sun: "1111110", none: "1111111" };
  const script = `
import sys, json, numpy as np
cases = json.load(sys.stdin)
res = []
for c in cases:
    hol = c["holidays"]
    if c["kind"] == "offset":
        roll = "backward" if c["n"] > 0 else "forward"
        r = np.busday_offset(c["a"], c["n"], roll=roll, weekmask=c["mask"], holidays=hol) if c["n"] != 0 else np.datetime64(c["a"])
        res.append(str(r))
    else:
        res.append(int(np.busday_count(c["a"], c["b"], weekmask=c["mask"], holidays=hol)))
print(json.dumps(res))`;
  let seed = 7;
  const rnd = (n: number) => ((seed = (seed * 1664525 + 1013904223) >>> 0) % n);
  const base = parseDay("2026-01-01")!;
  type Case = { kind: "offset" | "count"; a: string; b: string; n: number; w: keyof typeof WEEKENDS; hol: string[] };
  const cases: Case[] = Array.from({ length: 300 }, (_, i) => {
    const w = (Object.keys(WEEKENDS) as (keyof typeof WEEKENDS)[])[rnd(7)]!;
    const hol = Array.from({ length: rnd(8) }, () => fmtDay(base + rnd(400)));
    return { kind: i % 2 ? "offset" : "count", a: fmtDay(base + rnd(300)), b: fmtDay(base + rnd(400)), n: rnd(81) - 40, w, hol };
  });
  const payload = cases.map((c) => ({ kind: c.kind, a: c.a, b: c.b, n: c.n, mask: masks[c.w], holidays: c.hol }));
  const r = spawnSync("python3", ["-c", script], { input: JSON.stringify(payload), encoding: "utf8" });
  const want = r.status === 0 ? (JSON.parse(r.stdout) as (string | number)[]) : [];
  it("300 random offsets and counts across all weekend patterns", () => {
    expect(want).toHaveLength(300);
    cases.forEach((c, i) => {
      const cal = { weekend: WEEKENDS[c.w], holidays: new Set(c.hol.map((h) => parseDay(h)!)) };
      if (c.kind === "offset") expect(fmtDay(addBusinessDays(parseDay(c.a)!, c.n, cal)), `${i} ${JSON.stringify(c)}`).toBe(want[i]);
      else expect(countBusinessDays(parseDay(c.a)!, parseDay(c.b)!, cal), `${i} ${JSON.stringify(c)}`).toBe(want[i]);
    });
  });
});
