import type { TransformResult } from "@/lib/tool-transform";
import type { GeohashPlusCodeConverterOptions } from "./schema";

/* ---------- Geohash ---------- */
const GH = "0123456789bcdefghjkmnpqrstuvwxyz";

export interface Box { latLo: number; latHi: number; lngLo: number; lngHi: number }

export function geohashEncode(lat: number, lng: number, precision: number): string {
  const latR: [number, number] = [-90, 90];
  const lngR: [number, number] = [-180, 180];
  let out = "";
  let bit = 0, ch = 0, even = true;
  while (out.length < precision) {
    const r = even ? lngR : latR;
    const v = even ? lng : lat;
    const mid = (r[0] + r[1]) / 2;
    ch <<= 1;
    if (v >= mid) { ch |= 1; r[0] = mid; } else r[1] = mid;
    even = !even;
    if (++bit === 5) { out += GH[ch]!; bit = 0; ch = 0; }
  }
  return out;
}

export function geohashDecode(hash: string): Box | null {
  const latR: [number, number] = [-90, 90];
  const lngR: [number, number] = [-180, 180];
  let even = true;
  for (const c of hash.toLowerCase()) {
    const v = GH.indexOf(c);
    if (v < 0) return null;
    for (let b = 4; b >= 0; b--) {
      const r = even ? lngR : latR;
      const mid = (r[0] + r[1]) / 2;
      if ((v >> b) & 1) r[0] = mid; else r[1] = mid;
      even = !even;
    }
  }
  return { latLo: latR[0], latHi: latR[1], lngLo: lngR[0], lngHi: lngR[1] };
}

const DIRS: [string, number, number][] = [["N", 1, 0], ["NE", 1, 1], ["E", 0, 1], ["SE", -1, 1], ["S", -1, 0], ["SW", -1, -1], ["W", 0, -1], ["NW", 1, -1]];
export function geohashNeighbors(hash: string): [string, string | null][] {
  const b = geohashDecode(hash)!;
  const h = b.latHi - b.latLo, w = b.lngHi - b.lngLo;
  const lat = (b.latLo + b.latHi) / 2, lng = (b.lngLo + b.lngHi) / 2;
  return DIRS.map(([name, dy, dx]) => {
    const nl = lat + dy * h;
    if (nl > 90 || nl < -90) return [name, null];
    let ng = lng + dx * w;
    if (ng >= 180) ng -= 360;
    if (ng < -180) ng += 360;
    return [name, geohashEncode(nl, ng, hash.length)];
  });
}

/* ---------- Open Location Code (Plus Code) ---------- */
const OLC = "23456789CFGHJMPQRVWX";
const PAIR_PRECISION = 8000; // 20^3
const FINAL_LAT = PAIR_PRECISION * 5 ** 5;
const FINAL_LNG = PAIR_PRECISION * 4 ** 5;
const clip = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const normLng = (x: number) => { let l = x; while (l < -180) l += 360; while (l >= 180) l -= 360; return l; };
const latPrecision = (len: number) => (len <= 10 ? 20 ** Math.floor(len / -2 + 2) : 20 ** -3 / 5 ** (len - 10));
const round6 = (v: number) => Math.trunc(Number(v.toFixed(6)));

export function olcEncode(latIn: number, lngIn: number, length: number): string {
  let lat = clip(latIn, -90, 90);
  const lng = normLng(lngIn);
  if (lat === 90) lat -= latPrecision(length);
  let latVal = round6((lat + 90) * FINAL_LAT);
  let lngVal = round6((lng + 180) * FINAL_LNG);
  let code = "";
  if (length > 10) {
    for (let i = 0; i < 5; i++) {
      code = OLC[(latVal % 5) * 4 + (lngVal % 4)]! + code;
      latVal = Math.floor(latVal / 5);
      lngVal = Math.floor(lngVal / 4);
    }
  } else {
    latVal = Math.floor(latVal / 5 ** 5);
    lngVal = Math.floor(lngVal / 4 ** 5);
  }
  for (let i = 0; i < 5; i++) {
    code = OLC[lngVal % 20]! + code;
    code = OLC[latVal % 20]! + code;
    latVal = Math.floor(latVal / 20);
    lngVal = Math.floor(lngVal / 20);
  }
  code = code.slice(0, 8) + "+" + code.slice(8);
  if (length >= 8) return code.slice(0, length + 1);
  return code.slice(0, length) + "0".repeat(8 - length) + "+";
}

export function olcValidFull(code: string): boolean {
  const c = code.toUpperCase();
  if (c.split("+").length !== 2) return false;
  const sep = c.indexOf("+");
  if (sep !== 8) return false; // only full codes
  const pad = c.indexOf("0");
  if (pad !== -1) {
    const padPart = c.slice(pad, sep);
    if (!/^0+$/.test(padPart) || padPart.length % 2 || pad % 2 || c.length > sep + 1) return false;
  }
  if (c.length - sep - 1 === 1) return false;
  for (const ch of c) if (ch !== "+" && ch !== "0" && !OLC.includes(ch)) return false;
  if (OLC.indexOf(c[0]!) * 20 >= 180) return false;
  if (c.length > 1 && OLC.indexOf(c[1]!) * 20 >= 360) return false;
  return true;
}

export function olcDecode(code: string): (Box & { length: number }) | null {
  if (!olcValidFull(code)) return null;
  const c = code.replace(/[+0]/g, "").toUpperCase().slice(0, 15);
  let nLat = -90 * PAIR_PRECISION, nLng = -180 * PAIR_PRECISION, gLat = 0, gLng = 0;
  const digits = Math.min(c.length, 10);
  let pv = 20 ** 4;
  for (let i = 0; i < digits; i += 2) {
    nLat += OLC.indexOf(c[i]!) * pv;
    nLng += OLC.indexOf(c[i + 1]!) * pv;
    if (i < digits - 2) pv = Math.floor(pv / 20);
  }
  let latP = pv / PAIR_PRECISION, lngP = pv / PAIR_PRECISION;
  if (c.length > 10) {
    let rowPv = 5 ** 4, colPv = 4 ** 4;
    for (let i = 10; i < c.length; i++) {
      const d = OLC.indexOf(c[i]!);
      gLat += Math.floor(d / 4) * rowPv;
      gLng += (d % 4) * colPv;
      if (i < c.length - 1) { rowPv = Math.floor(rowPv / 5); colPv = Math.floor(colPv / 4); }
    }
    latP = rowPv / FINAL_LAT;
    lngP = colPv / FINAL_LNG;
  }
  const r = (x: number) => Math.round(x * 1e14) / 1e14;
  const lat = nLat / PAIR_PRECISION + gLat / FINAL_LAT;
  const lng = nLng / PAIR_PRECISION + gLng / FINAL_LNG;
  return { latLo: r(lat), lngLo: r(lng), latHi: r(lat + latP), lngHi: r(lng + lngP), length: c.length };
}

/* ---------- Tool ---------- */
const cellSize = (b: Box) => {
  const mLat = (b.latHi - b.latLo) * 111320;
  const mLng = (b.lngHi - b.lngLo) * 111320 * Math.cos((((b.latLo + b.latHi) / 2) * Math.PI) / 180);
  const f = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(1)} cm`);
  return `${f(mLng)} × ${f(mLat)}`;
};

export function geohashPlusCodeConverter(input: string, options: Partial<GeohashPlusCodeConverterOptions>): TransformResult {
  const o: GeohashPlusCodeConverterOptions = {
    geohashPrecision: options.geohashPrecision ?? 9, plusLength: options.plusLength ?? 10, bounds: options.bounds ?? true,
    neighbors: options.neighbors ?? false, decimals: options.decimals ?? 6,
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  if (o.plusLength < 10 && o.plusLength % 2) return fail("Plus codes shorter than 10 digits must have an even length (2, 4, 6, 8).");
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const fx = (n: number) => n.toFixed(o.decimals);
  const blocks: string[] = [];
  for (const [i, line] of lines.entries()) {
    const L: string[] = [];
    const pair = /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/.exec(line);
    if (pair) {
      const lat = Number(pair[1]), lng = Number(pair[2]);
      if (lat < -90 || lat > 90) return fail(`Line ${i + 1}: latitude ${lat} is outside −90…90.`);
      if (lng < -180 || lng > 180) return fail(`Line ${i + 1}: longitude ${lng} is outside −180…180.`);
      const gh = geohashEncode(lat, lng, o.geohashPrecision);
      const plus = olcEncode(lat, lng, o.plusLength);
      L.push(`${line}`, `  Geohash   ${gh}`, `  Plus Code ${plus}`);
      if (o.bounds) {
        const b = geohashDecode(gh)!;
        L.push(`  Geohash cell  ${cellSize(b)}`);
        const p = olcDecode(plus);
        if (p) L.push(`  Plus Code cell ${cellSize(p)}`);
      }
      if (o.neighbors) L.push(`  Neighbours  ${geohashNeighbors(gh).map(([n, h]) => `${n} ${h ?? "—"}`).join("  ")}`);
    } else if (line.includes("+")) {
      const first = line.split(/\s+/)[0]!;
      const b = olcDecode(first);
      if (!b) return fail(`Line ${i + 1}: "${first}" is not a valid full Plus Code (short codes need a reference location and are not supported).`);
      const lat = (b.latLo + b.latHi) / 2, lng = (b.lngLo + b.lngHi) / 2;
      L.push(first.toUpperCase(), `  Centre  ${fx(lat)}, ${fx(lng)}`);
      if (o.bounds) L.push(`  SW      ${fx(b.latLo)}, ${fx(b.lngLo)}`, `  NE      ${fx(b.latHi)}, ${fx(b.lngHi)}`, `  Cell    ${cellSize(b)}`);
      L.push(`  Geohash ${geohashEncode(lat, lng, o.geohashPrecision)}`);
    } else if (/^[0-9b-hjkmnp-z]+$/i.test(line) && line.length <= 12) {
      const b = geohashDecode(line)!;
      const lat = (b.latLo + b.latHi) / 2, lng = (b.lngLo + b.lngHi) / 2;
      L.push(line.toLowerCase(), `  Centre  ${fx(lat)}, ${fx(lng)}`);
      if (o.bounds) L.push(`  SW      ${fx(b.latLo)}, ${fx(b.lngLo)}`, `  NE      ${fx(b.latHi)}, ${fx(b.lngHi)}`, `  Cell    ${cellSize(b)}`);
      L.push(`  Plus Code ${olcEncode(lat, lng, o.plusLength)}`);
      if (o.neighbors) L.push(`  Neighbours  ${geohashNeighbors(line.toLowerCase()).map(([n, h]) => `${n} ${h ?? "—"}`).join("  ")}`);
    } else return fail(`Line ${i + 1}: "${line}" is not "lat, lng", a geohash (0-9 b-z without a i l o) or a Plus Code containing "+".`);
    blocks.push(L.join("\n"));
  }
  return { output: blocks.join("\n\n") + "\n", error: null };
}
