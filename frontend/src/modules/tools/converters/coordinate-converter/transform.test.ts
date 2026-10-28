import { describe, expect, it } from "vitest";
import { convertCoordinates, geohash, parseCoordinate, toDdm, toDms, toUtm } from "./transform";

describe("parseCoordinate", () => {
  it("reads decimal degrees", () => {
    expect(parseCoordinate("48.8584, 2.2945")).toEqual({ lat: 48.8584, lon: 2.2945 });
    expect(parseCoordinate("-33.8688 151.2093")).toEqual({ lat: -33.8688, lon: 151.2093 });
  });
  it("reads DMS, DDM and hemisphere letters", () => {
    const a = parseCoordinate(`40°42'46"N 74°00'22"W`);
    expect(a.lat).toBeCloseTo(40.712778, 5);
    expect(a.lon).toBeCloseTo(-74.006111, 5);
    const b = parseCoordinate("40 42.767 N, 74 0.367 W");
    expect(b.lat).toBeCloseTo(40.712783, 5);
    expect(b.lon).toBeCloseTo(-74.006117, 5);
  });
  it("accepts longitude first when hemispheres are given", () => {
    expect(parseCoordinate("2.2945 E, 48.8584 N")).toEqual({ lat: 48.8584, lon: 2.2945 });
  });
  it("rejects out-of-range and malformed input", () => {
    expect(() => parseCoordinate("91, 0")).toThrow(/Latitude/);
    expect(() => parseCoordinate("0, 181")).toThrow(/Longitude/);
    expect(() => parseCoordinate("40 E, 10 N".replace("40 E", "40 E"))).not.toThrow();
    expect(() => parseCoordinate("10 N, 20 N")).toThrow(/not valid/);
    expect(() => parseCoordinate("40°75'00\"N, 10")).toThrow(/below 60/);
    expect(() => parseCoordinate("hello")).toThrow();
  });
});

describe("formatters", () => {
  it("formats DMS and DDM", () => {
    expect(toDms(40.712778, "lat", 5)).toBe("40°42′46.00″N");
    expect(toDms(-74.006111, "lon", 5)).toBe("74°00′22.00″W");
    expect(toDdm(-33.8688, "lat", 5)).toBe("33°52.1280′S");
  });
  it("carries rounding overflow", () => {
    expect(toDms(10.99999999, "lat", 5)).toBe("11°00′00.00″N");
  });
  it("computes geohashes (Wikipedia reference values)", () => {
    expect(geohash(42.6, -5.6, 5)).toBe("ezs42");
    expect(geohash(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohash(48.8584, 2.2945, 9)).toBe("u09tunquc");
  });
});

describe("toUtm (pyproj EPSG:326xx reference, ±1 m)", () => {
  const parse = (s: string) => { const m = /^(\d+)([A-Z]) (\d+) E (\d+) N$/.exec(s)!; return { zone: m[1], band: m[2], e: +m[3]!, n: +m[4]! }; };
  it("Paris", () => {
    const u = parse(toUtm(48.8584, 2.2945));
    expect([u.zone, u.band]).toEqual(["31", "U"]);
    expect(Math.abs(u.e - 448252)).toBeLessThan(1);
    expect(Math.abs(u.n - 5411955)).toBeLessThan(1);
  });
  it("Sydney (southern hemisphere false northing)", () => {
    const u = parse(toUtm(-33.8688, 151.2093));
    expect([u.zone, u.band]).toEqual(["56", "H"]);
    expect(Math.abs(u.e - 334369)).toBeLessThan(1);
    expect(Math.abs(u.n - 6250948)).toBeLessThan(1);
  });
  it("New York and polar limits", () => {
    const u = parse(toUtm(40.7128, -74.006));
    expect([u.zone, u.band]).toEqual(["18", "T"]);
    expect(Math.abs(u.e - 583959)).toBeLessThan(1);
    expect(toUtm(89, 0)).toMatch(/outside UTM/);
  });
  it("applies the Norway zone exception", () => {
    expect(toUtm(60, 5)).toMatch(/^32V/);
  });
});

describe("convertCoordinates", () => {
  it("emits all formats and reports bad lines", () => {
    const r = convertCoordinates("48.8584, 2.2945\nnope", { precision: 5, geohashLength: 9, showUtm: true });
    expect(r.output).toContain("Decimal:  48.85840, 2.29450");
    expect(r.output).toContain("Geohash:  u09tunquc");
    expect(r.output).toContain("UTM:      31U");
    expect(r.error?.line).toBe(2);
  });
  it("can hide UTM", () => {
    expect(convertCoordinates("1,1", { precision: 3, geohashLength: 5, showUtm: false }).output).not.toContain("UTM");
  });
});
