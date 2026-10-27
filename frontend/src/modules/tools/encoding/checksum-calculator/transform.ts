import type { TransformResult } from "@/lib/tool-transform";
import type { ChecksumCalculatorOptions } from "./schema";

function crc32Table(poly: number): Uint32Array {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? poly ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
const T_IEEE = crc32Table(0xedb88320);
const T_C = crc32Table(0x82f63b78);

const crc32With = (table: Uint32Array, data: Uint8Array) => {
  let c = 0xffffffff;
  for (const b of data) c = table[(c ^ b) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
export const crc32 = (d: Uint8Array) => crc32With(T_IEEE, d);
export const crc32c = (d: Uint8Array) => crc32With(T_C, d);

export function adler32(data: Uint8Array): number {
  let a = 1, b = 0;
  for (const x of data) { a = (a + x) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

/** CRC-16/CCITT-FALSE: poly 0x1021, init 0xFFFF, no reflection. */
export function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  for (const x of data) {
    crc ^= x << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

export function fletcher16(data: Uint8Array): number {
  let s1 = 0, s2 = 0;
  for (const x of data) { s1 = (s1 + x) % 255; s2 = (s2 + s1) % 255; }
  return (s2 << 8) | s1;
}

const ALGOS = {
  crc32: { fn: crc32, width: 8, name: "CRC-32 (IEEE, zip/png/gzip)" },
  crc32c: { fn: crc32c, width: 8, name: "CRC-32C (Castagnoli, iSCSI/Kafka)" },
  adler32: { fn: adler32, width: 8, name: "Adler-32 (zlib)" },
  crc16: { fn: crc16, width: 4, name: "CRC-16/CCITT-FALSE" },
  fletcher16: { fn: fletcher16, width: 4, name: "Fletcher-16" },
} as const;

export function checksum(input: string, options: ChecksumCalculatorOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };
  let bytes: Uint8Array;
  if (options.inputFormat === "hex") {
    const h = input.replace(/0x|[\s,:-]/gi, "");
    if (!/^([0-9a-f]{2})+$/i.test(h)) return { output: "", error: { message: "Hex input must be whole bytes, e.g. 48 65 6c 6c 6f." } };
    bytes = Uint8Array.from(h.match(/../g)!, (x) => parseInt(x, 16));
  } else {
    bytes = new TextEncoder().encode(input);
  }
  const rows = (options.algorithm === "all" ? (Object.keys(ALGOS) as (keyof typeof ALGOS)[]) : [options.algorithm as keyof typeof ALGOS]).map((k) => {
    const a = ALGOS[k];
    const v = a.fn(bytes);
    return `${a.name.padEnd(36)} 0x${v.toString(16).toUpperCase().padStart(a.width, "0")}  (${v})`;
  });
  rows.push("", `${bytes.length} byte${bytes.length === 1 ? "" : "s"}`);
  return { output: rows.join("\n"), error: null };
}
