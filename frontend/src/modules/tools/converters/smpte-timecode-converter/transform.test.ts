import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { RATES, fmtTc, framesToTc, smpteTimecodeConverter, tcToFrames } from "./transform";

const run = (input: string, o: Parameters<typeof smpteTimecodeConverter>[1] = {}) => {
  const r = smpteTimecodeConverter(input, o);
  if (r.error) throw new Error(r.error.message);
  return r.output;
};
const tc = (frames: number, fps: keyof typeof RATES, df: boolean) => fmtTc(framesToTc(frames, RATES[fps]!, df), df, RATES[fps]!);

describe("drop-frame arithmetic", () => {
  it("29.97 DF known values", () => {
    expect(tc(0, "29.97", true)).toBe("00:00:00;00");
    expect(tc(1799, "29.97", true)).toBe("00:00:59;29");
    expect(tc(1800, "29.97", true)).toBe("00:01:00;02"); // frames 00 and 01 skipped
    expect(tc(17981, "29.97", true)).toBe("00:09:59;29");
    expect(tc(17982, "29.97", true)).toBe("00:10:00;00"); // every 10th minute keeps its frames
    expect(tc(107892, "29.97", true)).toBe("01:00:00;00"); // one hour of DF = 107892 frames
    expect(tc(107892, "29.97", false)).toBe("00:59:56:12"); // NDF drifts
  });
  it("59.94 DF drops 4 per minute", () => {
    expect(tc(3600, "59.94", true)).toBe("00:01:00;04");
    expect(tc(215784, "59.94", true)).toBe("01:00:00;00");
  });
  it("round trip", () => {
    for (const fps of ["29.97", "59.94"] as const)
      for (let f = 0; f < 400000; f += 997) {
        const t = framesToTc(f, RATES[fps]!, true);
        expect(tcToFrames(t.h, t.m, t.s, t.f, RATES[fps]!, true)).toBe(f);
      }
  });
  it("rejects timecodes that do not exist", () => {
    expect(() => tcToFrames(0, 1, 0, 0, RATES["29.97"]!, true)).toThrow(/does not exist in drop-frame/);
    expect(() => tcToFrames(0, 1, 0, 2, RATES["29.97"]!, true)).not.toThrow();
    expect(() => tcToFrames(0, 10, 0, 0, RATES["29.97"]!, true)).not.toThrow();
    expect(() => tcToFrames(0, 0, 0, 30, RATES["29.97"]!, false)).toThrow(/out of range/);
    expect(() => tcToFrames(0, 60, 0, 0, RATES["25"]!, false)).toThrow(/below 60/);
  });
  it("negative frames", () => {
    expect(tc(-30, "30", false)).toBe("-00:00:01:00");
  });
});

describe("convert", () => {
  it("timecode → everything (29.97 DF)", () => {
    const t = run("01:00:00;00");
    expect(t).toMatch(/Timecode\s+01:00:00;00 {2}\(drop-frame\)/);
    expect(t).toMatch(/Frames\s+107892/);
    expect(t).toMatch(/Seconds \(real\)\s+3599\.9964\n/);
    expect(t).toMatch(/Clock time\s+00:59:59\.996/);
    expect(t).toMatch(/Non-drop equivalent\s+00:59:56:12/);
  });
  it("frames, seconds and clock inputs", () => {
    expect(run("1800", { output: "timecode" })).toBe("00:01:00;02");
    expect(run("1800f", { output: "timecode" })).toBe("00:01:00;02");
    expect(run("60s", { output: "frames" })).toBe("1798");
    expect(run("00:01:00.000", { output: "frames" })).toBe("1798");
    expect(run("1.5", { output: "frames", fps: "24" })).toBe("36");
  });
  it("separator decides drop-frame, option decides the default", () => {
    expect(run("00:10:00;00", { output: "frames" })).toBe("17982");
    expect(run("00:10:00:00", { output: "frames", dropFrame: false })).toBe("18000");
    expect(run("00:10:00:00", { output: "frames", dropFrame: true })).toBe("17982");
    expect(() => run("00:10:00;00", { fps: "25" })).toThrow(/no drop-frame/);
  });
  it("start timecode offset", () => {
    const t = run("01:00:10:00", { fps: "25", startTc: "01:00:00:00" });
    expect(t).toMatch(/Frames\s+250/);
    expect(t).toMatch(/Absolute frame\s+90250/);
    expect(run("250", { fps: "25", startTc: "01:00:00:00", output: "timecode" })).toBe("01:00:10:00");
  });
  it("film feet+frames at 24", () => {
    expect(run("100", { fps: "24" })).toMatch(/35mm 4-perf feet\+frames\s+6\+04/);
  });
  it("batch with errors per line", () => {
    const out = run("00:00:01:00\nnope\n00:00:02:00", { fps: "25", output: "frames" });
    expect(out).toBe("00:00:01:00\t25\nnope\t! Can't read \"nope\": use 01:00:00:00, 01:00:00;00 (drop-frame), 1800f, 12.5s or 00:01:02.500\n00:00:02:00\t50");
  });
});

describe("sum / difference / retime", () => {
  it("sum", () => {
    const out = run("00:00:30:00\n00:00:45:00\n00:00:20:00", { fps: "25", mode: "sum", output: "timecode" });
    expect(out).toMatch(/Sum of 3 values/);
    expect(out).toMatch(/00:01:35:00/);
  });
  it("difference (first minus the rest)", () => {
    expect(run("00:10:00:00\n00:02:30:00", { fps: "24", mode: "difference", output: "timecode" })).toMatch(/00:07:30:00/);
    expect(() => run("00:10:00:00", { mode: "difference" })).toThrow(/at least two/);
  });
  it("retime keeping real time", () => {
    const out = run("00:01:00:00", { fps: "24", mode: "retime", targetFps: "25", retimeMethod: "time" });
    expect(out).toContain("00:01:00:00 @ 24 → 00:01:00:00 @ 25");
  });
  it("retime keeping frames (PAL speed-up)", () => {
    const out = run("01:00:00:00", { fps: "24", mode: "retime", targetFps: "25", retimeMethod: "frames" });
    expect(out).toContain("01:00:00:00 @ 24 → 00:57:36:00 @ 25");
    expect(out).toContain("104.167% speed");
  });
  it("empty input", () => {
    expect(smpteTimecodeConverter("").output).toBe("");
  });
});

// ---- oracle: the Python `timecode` library ----
const py = (code: string) => spawnSync("python3", ["-c", code], { encoding: "utf8" });
const hasLib = py("import timecode").status === 0;
describe.skipIf(!hasLib)("python timecode oracle", () => {
  const cases: Array<[string, keyof typeof RATES, boolean]> = [
    ["23.976", "23.976", false],
    ["24", "24", false],
    ["25", "25", false],
    ["29.97", "29.97", true],
    ["29.97", "29.97", false],
    ["30", "30", false],
    ["50", "50", false],
    ["59.94", "59.94", true],
    ["60", "60", false],
  ];
  for (const [fpsArg, fps, df] of cases) {
    it(`${fps} fps ${df ? "DF" : "NDF"}: frames → timecode`, () => {
      const frames: number[] = [];
      for (let f = 0; f < 700000; f += 1237) frames.push(f);
      for (const f of [0, 1, 1797, 1798, 1799, 1800, 1801, 17981, 17982, 17983, 35963, 35964, 107891, 107892, 107893, 215783, 215784]) frames.push(f);
      const rr = spawnSync("python3", ["-c", `
import json, sys
from timecode import Timecode
fps=${JSON.stringify(fpsArg)}
df=${df ? "True" : "False"}
out=[]
for f in json.loads(sys.stdin.read()):
    t=Timecode(fps, frames=f+1, force_non_drop_frame=not df)
    out.append(str(t))
print(json.dumps(out))`], { input: JSON.stringify(frames), encoding: "utf8" });
      expect(rr.stderr).toBe("");
      const expected = JSON.parse(rr.stdout) as string[];
      frames.forEach((f, i) => {
        expect(tc(f, fps, df), `${fps} ${df ? "DF" : "NDF"} frame ${f}`).toBe(expected[i]);
      });
    });
    it(`${fps} fps ${df ? "DF" : "NDF"}: timecode → frames`, () => {
      const samples: string[] = [];
      for (let f = 0; f < 300000; f += 4271) samples.push(tc(f, fps, df));
      const rr = spawnSync("python3", ["-c", `
import json, sys
from timecode import Timecode
fps=${JSON.stringify(fpsArg)}
df=${df ? "True" : "False"}
out=[]
for s in json.loads(sys.stdin.read()):
    out.append(Timecode(fps, s, force_non_drop_frame=not df).frames - 1)
print(json.dumps(out))`], { input: JSON.stringify(samples), encoding: "utf8" });
      expect(rr.stderr).toBe("");
      const expected = JSON.parse(rr.stdout) as number[];
      samples.forEach((s, i) => {
        const m = /^(\d+):(\d+):(\d+)[:;](\d+)$/.exec(s)!;
        expect(tcToFrames(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), RATES[fps]!, df), s).toBe(expected[i]);
      });
    });
  }
});
