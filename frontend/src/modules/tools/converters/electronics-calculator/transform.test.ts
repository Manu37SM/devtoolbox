import { describe, expect, it } from "vitest";
import { formatSi, nextE24, parseSi, runElectronics } from "./transform";

const run = (operation: Parameters<typeof runElectronics>[1]["operation"], s: string) => runElectronics(s, { operation });

describe("si helpers", () => {
  it("parses prefixes, code notation and units", () => {
    expect(parseSi("4.7k")).toBe(4700);
    expect(parseSi("4k7")).toBeCloseTo(4700);
    expect(parseSi("1R5")).toBeCloseTo(1.5);
    expect(parseSi("100nF")).toBeCloseTo(1e-7);
    expect(parseSi("20mA")).toBeCloseTo(0.02);
    expect(parseSi("2.2 Mohm")).toBeCloseTo(2.2e6);
    expect(parseSi("1e-3")).toBeCloseTo(0.001);
    expect(parseSi("abc")).toBeNull();
  });
  it("formats", () => {
    expect(formatSi(4700, "Ω")).toBe("4.7 kΩ");
    expect(formatSi(0.00159, "s")).toBe("1.59 ms");
    expect(formatSi(0, "V")).toBe("0 V");
  });
  it("E24 rounds up", () => {
    expect(nextE24(150)).toBe(150);
    expect(nextE24(1941.18)).toBe(2000);
    expect(nextE24(101)).toBe(110);
    expect(nextE24(9500)).toBe(10000);
  });
});

describe("operations (reference values computed in Python)", () => {
  it("ohms law from any two", () => {
    const o = run("ohms-law", "v: 12\ni: 20m").output;
    expect(o).toContain("Resistance  600 Ω");
    expect(o).toContain("Power       240 mW");
    expect(run("ohms-law", "r: 600\np: 0.24").output).toContain("Voltage     12 V");
    expect(run("ohms-law", "v: 12").error?.message).toMatch(/exactly two/);
  });
  it("led resistor", () => {
    const o = run("led-resistor", "vs: 5\nvf: 2\ni: 20m").output;
    expect(o).toContain("Exact resistor    150 Ω");
    expect(o).toContain("Resistor power    60 mW");
    expect(run("led-resistor", "vs: 2\nvf: 3\ni: 20m").error?.message).toMatch(/higher/);
  });
  it("voltage divider both directions", () => {
    expect(run("voltage-divider", "vin: 9\nr1: 10k\nr2: 5k").output).toContain("Vout  3 V");
    const r = run("voltage-divider", "vin: 5\nvout: 3.3\nr1: 1k").output;
    expect(r).toContain("R2  1.941 kΩ");
    expect(r).toContain("Next E24 value  2 kΩ");
  });
  it("series/parallel", () => {
    const o = run("series-parallel", "values: 100, 220").output;
    expect(o).toContain("Series    320 Ω");
    expect(o).toContain("Parallel  68.75 Ω");
    expect(run("series-parallel", "values: 1k 1k 1k").output).toContain("Parallel  333.3 Ω");
  });
  it("rc filter", () => {
    const o = run("rc-filter", "r: 10k\nc: 100n").output;
    expect(o).toContain("1 ms");
    expect(o).toContain("159.2 Hz");
  });
  it("resistor colour code", () => {
    expect(run("resistor-color-code", "bands: brown black red gold").output).toMatch(/^1 kΩ ±5%/);
    expect(run("resistor-color-code", "bands: yellow violet black brown brown").output).toMatch(/^4\.7 kΩ ±1%/);
    expect(run("resistor-color-code", "bands: gold black red gold").error?.message).toMatch(/Digit/);
    expect(run("resistor-color-code", "bands: pink").error).not.toBeNull();
  });
  it("555 astable", () => {
    const o = run("timer-555-astable", "r1: 1k\nr2: 10k\nc: 100n").output;
    expect(o).toContain("Frequency  685.7 Hz");
    expect(o).toContain("Duty cycle 52.38%");
  });
  it("empty", () => { expect(run("ohms-law", "")).toEqual({ output: "", error: null }); });
});
