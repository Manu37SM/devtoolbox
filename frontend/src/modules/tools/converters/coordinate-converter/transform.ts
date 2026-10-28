import type { TransformResult } from "@/lib/tool-transform";
import type { CoordinateConverterOptions } from "./schema";

function parseComponent(text: string, axis: "lat" | "lon"): number {
  const letter = /[NSEW]/i.exec(text)?.[0]?.toUpperCase();
  if (letter && (axis === "lat" ? !"NS".includes(letter) : !"EW".includes(letter))) throw new Error(`"${letter}" is not valid for ${axis === "lat" ? "latitude" : "longitude"}`);
  const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length || nums.length > 3) throw new Error(`Cannot read "${text.trim()}"`);
  const [d, m = 0, s = 0] = nums as [number, number?, number?];
  if (nums.length > 1 && (m >= 60 || s >= 60)) throw new Error("Minutes and seconds must be below 60");
  if (nums.length === 3 && !Number.isInteger(m)) throw new Error("Only the last unit may have a fraction");
  let v = d + m / 60 + s / 3600;
  if (/^\s*[-−]/.test(text) || letter === "S" || letter === "W") v = -v;
  const max = axis === "lat" ? 90 : 180;
  if (Math.abs(v) > max) throw new Error(`${axis === "lat" ? "Latitude" : "Longitude"} must be within ±${max}°`);
  return v;
}

export function parseCoordinate(line: string): { lat: number; lon: number } {
  const s = line.trim().replace(/[()]/g, "").replace(/^(lat(itude)?|coords?)[:\s]*/i, "");
  let parts: string[];
  if (/[,;]/.test(s)) parts = s.split(/[,;]/);
  else {
    const m = /^(.*?[NSns])\s*(.+)$/.exec(s) ?? /^(.*?[EWew])\s*(.+)$/.exec(s);
    if (m && /[NSEW]\s*$/i.test(m[1]!)) parts = [m[1]!, m[2]!];
    else {
      const w = s.split(/\s+/);
      if (w.length === 2) parts = w;
      else throw new Error("Could not split into latitude and longitude; separate them with a comma");
    }
  }
  if (parts.length !== 2) throw new Error("Expected exactly two components (latitude, longitude)");
  const [a, b] = parts as [string, string];
  const aIsLon = /[EW]/i.test(a) && !/[NS]/i.test(a);
  return aIsLon ? { lat: parseComponent(b, "lat"), lon: parseComponent(a, "lon") } : { lat: parseComponent(a, "lat"), lon: parseComponent(b, "lon") };
}

export function toDms(v: number, axis: "lat" | "lon", p: number): string {
  const hemi = axis === "lat" ? (v < 0 ? "S" : "N") : v < 0 ? "W" : "E";
  const a = Math.abs(v);
  let d = Math.floor(a);
  let m = Math.floor((a - d) * 60);
  let s = +(((a - d) * 60 - m) * 60).toFixed(Math.max(p - 3, 0));
  if (s >= 60) { s = 0; m++; }
  if (m >= 60) { m = 0; d++; }
  const dec = Math.max(p - 3, 0);
  return `${d}°${String(m).padStart(2, "0")}′${s.toFixed(dec).padStart(dec ? dec + 3 : 2, "0")}″${hemi}`;
}

export function toDdm(v: number, axis: "lat" | "lon", p: number): string {
  const hemi = axis === "lat" ? (v < 0 ? "S" : "N") : v < 0 ? "W" : "E";
  const a = Math.abs(v);
  let d = Math.floor(a);
  let m = +((a - d) * 60).toFixed(Math.max(p - 1, 0));
  if (m >= 60) { m = 0; d++; }
  return `${d}°${m.toFixed(Math.max(p - 1, 0))}′${hemi}`;
}

const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function geohash(lat: number, lon: number, length: number): string {
  const latR = [-90, 90], lonR = [-180, 180];
  let out = "", bits = 0, ch = 0, even = true;
  while (out.length < length) {
    const r = even ? lonR : latR;
    const v = even ? lon : lat;
    const mid = (r[0]! + r[1]!) / 2;
    if (v >= mid) { ch = ch * 2 + 1; r[0] = mid; } else { ch *= 2; r[1] = mid; }
    even = !even;
    if (++bits === 5) { out += B32[ch]; bits = 0; ch = 0; }
  }
  return out;
}

export function toUtm(lat: number, lon: number): string {
  if (lat < -80 || lat > 84) return "outside UTM range (80°S – 84°N); use UPS";
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  const band = bands[Math.min(Math.floor((lat + 80) / 8), 19)]!;
  let zone = Math.floor((lon + 180) / 6) + 1;
  if (zone > 60) zone = 60;
  if (band === "V" && lon >= 3 && lon < 12) zone = 32;
  if (band === "X") {
    if (lon >= 0 && lon < 9) zone = 31;
    else if (lon >= 9 && lon < 21) zone = 33;
    else if (lon >= 21 && lon < 33) zone = 35;
    else if (lon >= 33 && lon < 42) zone = 37;
  }
  const a = 6378137, f = 1 / 298.257223563, k0 = 0.9996;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2);
  const rad = Math.PI / 180;
  const phi = lat * rad;
  const lam0 = ((zone - 1) * 6 - 180 + 3) * rad;
  const dl = lon * rad - lam0;
  const N = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = ep2 * Math.cos(phi) ** 2;
  const A = dl * Math.cos(phi);
  const M = a * ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi - ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) + ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) - ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi));
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000;
  let y = k0 * (M + N * Math.tan(phi) * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (lat < 0) y += 10000000;
  return `${zone}${band} ${Math.round(x)} E ${Math.round(y)} N`;
}

export function convertCoordinates(input: string, options: CoordinateConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const p = options.precision;
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      const { lat, lon } = parseCoordinate(l);
      const rows = [
        `Decimal:  ${lat.toFixed(p)}, ${lon.toFixed(p)}`,
        `DMS:      ${toDms(lat, "lat", p)} ${toDms(lon, "lon", p)}`,
        `DDM:      ${toDdm(lat, "lat", p)} ${toDdm(lon, "lon", p)}`,
        `Geohash:  ${geohash(lat, lon, options.geohashLength)}`,
      ];
      if (options.showUtm) rows.push(`UTM:      ${toUtm(lat, lon)}`);
      rows.push(`Maps:     https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=15/${lat.toFixed(6)}/${lon.toFixed(6)}`);
      out.push(`${l}\n${rows.map((r) => "  " + r).join("\n")}`);
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`${l}\n  ✗ ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: firstErr };
}
