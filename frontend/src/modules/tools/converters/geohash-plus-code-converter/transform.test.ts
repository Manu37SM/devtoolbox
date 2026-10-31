import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { geohashDecode, geohashEncode, geohashNeighbors, geohashPlusCodeConverter as conv, olcDecode, olcEncode } from "./transform";

describe("geohash", () => {
  it("known values", () => {
    expect(geohashEncode(57.64911, 10.40744, 11)).toBe("u4pruydqqvj");
    expect(geohashEncode(42.6, -5.6, 5)).toBe("ezs42");
    expect(geohashEncode(0, 0, 4)).toBe("s000");
  });
  it("decode brackets the point", () => {
    const b = geohashDecode("ezs42")!;
    expect(42.6).toBeGreaterThan(b.latLo);
    expect(42.6).toBeLessThan(b.latHi);
    expect(geohashDecode("a")).toBeNull();
  });
  it("neighbours are adjacent and wrap at the antimeridian", () => {
    const n = Object.fromEntries(geohashNeighbors("ezs42")) as Record<string, string>;
    expect(n.N).toBe("ezs48");
    expect(new Set(Object.values(n)).size).toBe(8);
    const e = geohashNeighbors(geohashEncode(10, 179.99999, 6)).find(([d]) => d === "E")![1]!;
    expect(geohashDecode(e)!.lngLo).toBeLessThan(-179);
    expect(geohashNeighbors(geohashEncode(89.99999, 0, 6)).find(([d]) => d === "N")![1]).toBeNull();
  });
});
describe("plus codes", () => {
  it("reference examples", () => {
    expect(olcEncode(47.365590, 8.524997, 10)).toBe("8FVC9G8F+6X");
    expect(olcEncode(20.375, 2.775, 6)).toBe("7FG49Q00+");
    expect(olcEncode(20.3700625, 2.7821875, 11)).toBe("7FG49QCJ+2VG");
  });
  it("decode", () => {
    const d = olcDecode("8FVC9G8F+6X")!;
    expect(d.latLo).toBeCloseTo(47.3655, 6);
    expect(olcDecode("8FVC9G8F+6")).toBeNull();
    expect(olcDecode("9G8F+6X")).toBeNull(); // short codes unsupported
  });
});
describe("tool", () => {
  it("auto-detects the three input shapes", () => {
    const out = conv("47.3656, 8.525\nu0qj\n8FVC9G8F+6X", {}).output;
    expect(out).toContain("Geohash   u0qj3yxsw");
    expect(out).toContain("Plus Code 8FVC9G");
    expect(out).toContain("Centre");
  });
  it("errors", () => {
    expect(conv("95, 10", {}).error).not.toBeNull();
    expect(conv("hello", {}).error).not.toBeNull();
    expect(conv("1,1", { plusLength: 7 }).error).not.toBeNull();
  });
});

// Oracles: pygeohash / geohash2 and Google's openlocationcode
const py = (m: string) => spawnSync("python3", ["-c", `import ${m}`], { encoding: "utf8" }).status === 0;
describe.skipIf(!py("openlocationcode"))("matches openlocationcode", () => {
  let s = 99;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pts = Array.from({ length: 400 }, (_, i) => [i < 4 ? [90, -90, 0, 89.9999][i]! : rnd() * 180 - 90, i < 4 ? [180, -180, 0, 179.9999][i]! : rnd() * 360 - 180] as [number, number]);
  const lens = [2, 4, 6, 8, 10, 11, 12, 13, 14, 15];
  it("encodes and decodes 400 random points at every length", () => {
    const script = `
import sys, json
from openlocationcode import openlocationcode as o
d = json.load(sys.stdin)
res = []
for lat, lng in d["pts"]:
    for n in d["lens"]:
        c = o.encode(lat, lng, n)
        a = o.decode(c)
        res.append([c, a.latitudeLo, a.longitudeLo, a.latitudeHi, a.longitudeHi])
print(json.dumps(res))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify({ pts, lens }), encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const want = JSON.parse(r.stdout) as [string, number, number, number, number][];
    let k = 0;
    for (const [lat, lng] of pts) for (const n of lens) {
      const w = want[k++]!;
      const code = olcEncode(lat, lng, n);
      expect(code, `${lat},${lng} len ${n}`).toBe(w[0]);
      const d = olcDecode(code)!;
      [d.latLo, d.lngLo, d.latHi, d.lngHi].forEach((x, j) => expect(Math.abs(x - (w[j + 1] as number))).toBeLessThan(1e-9));
    }
  });
});
describe.skipIf(!py("pygeohash"))("matches pygeohash", () => {
  it("encodes 400 random points at every precision", () => {
    let s = 5;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    const pts = Array.from({ length: 400 }, () => [rnd() * 180 - 90, rnd() * 360 - 180] as [number, number]);
    const script = `
import sys, json, pygeohash as g
pts = json.load(sys.stdin)
print(json.dumps([[g.encode(a, b, p) for p in range(1, 13)] for a, b in pts]))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify(pts), encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const want = JSON.parse(r.stdout) as string[][];
    pts.forEach(([a, b], i) => { for (let p = 1; p <= 12; p++) expect(geohashEncode(a, b, p), `${a},${b} p${p}`).toBe(want[i]![p - 1]); });
  });
});
