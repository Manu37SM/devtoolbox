import type { TransformResult } from "@/lib/tool-transform";
import type { Iso8583ParserOptions } from "./schema";
import { ACCOUNT, CURRENCY, ENTRY_MODE, FIELDS, MTI_CLASS, MTI_FUNCTION, MTI_ORIGIN, MTI_VERSION, PROCESSING, RESPONSE, type FieldDef } from "./fields";

export interface ParsedField { no: number; def: FieldDef; raw: string }
export interface Parsed { mti: string; bitmapHex: string; fields: ParsedField[]; trailing: number }

const toHex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("").toUpperCase();
const ascii = (b: Uint8Array) => String.fromCharCode(...b);
export function hexToBytes(hex: string): Uint8Array {
  const h = hex.replace(/\s+/g, "");
  if (!/^([0-9a-fA-F]{2})*$/.test(h)) throw new Error("Hex input must contain an even number of hex digits.");
  return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
}

class Reader {
  pos = 0;
  constructor(private b: Uint8Array) {}
  take(n: number, what: string): Uint8Array {
    if (this.pos + n > this.b.length) throw new Error(`Message ended while reading ${what} (needed ${n} bytes at offset ${this.pos}, ${this.b.length - this.pos} left).`);
    const out = this.b.slice(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }
  get left() { return this.b.length - this.pos; }
}

function bitsFromHex(hex: string, base: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < hex.length; i++) {
    const nib = parseInt(hex[i]!, 16);
    for (let bit = 0; bit < 4; bit++) if (nib & (8 >> bit)) out.push(base + i * 4 + bit + 1);
  }
  return out;
}

export function parseIso8583(input: string, encoding: Iso8583ParserOptions["encoding"]): Parsed {
  const textMode = encoding === "ascii";
  const bytes = textMode ? Uint8Array.from(input.replace(/[\r\n]+$/g, ""), (c) => c.charCodeAt(0) & 0xff) : hexToBytes(input);
  const r = new Reader(bytes);
  const bcd = encoding === "bcd";
  const mti = bcd ? toHex(r.take(2, "MTI")) : ascii(r.take(4, "MTI"));
  if (!/^\d{4}$/.test(mti)) throw new Error(`MTI "${mti}" is not 4 digits. Check the encoding option.`);
  const readBitmap = (what: string) => (textMode ? ascii(r.take(16, what)).toUpperCase() : toHex(r.take(8, what)));
  let bitmapHex = readBitmap("primary bitmap");
  if (!/^[0-9A-F]{16}$/.test(bitmapHex)) throw new Error(`Primary bitmap "${bitmapHex}" is not 16 hex digits. Try the "ASCII, binary bitmap" encoding.`);
  let present = bitsFromHex(bitmapHex, 0);
  if (present.includes(1)) {
    const second = readBitmap("secondary bitmap");
    if (!/^[0-9A-F]{16}$/.test(second)) throw new Error(`Secondary bitmap "${second}" is not valid hex.`);
    bitmapHex += second;
    present = [...present.filter((n) => n !== 1), ...bitsFromHex(second, 64)];
  }
  const fields: ParsedField[] = [];
  if (bitmapHex.length > 16) fields.push({ no: 1, def: FIELDS[1]!, raw: bitmapHex.slice(16) });
  for (const no of present) {
    const def = FIELDS[no];
    if (!def) throw new Error(`Field ${no} is not defined.`);
    let len = def.len;
    if (def.var) {
      const digits = bcd ? toHex(r.take(def.var === 2 ? 1 : 2, `length of field ${no}`)).slice(def.var === 2 ? 0 : 1) : ascii(r.take(def.var, `length of field ${no}`));
      if (!/^\d+$/.test(digits)) throw new Error(`Field ${no}: length prefix "${digits}" is not numeric.`);
      len = Number(digits);
      if (len > def.len) throw new Error(`Field ${no}: length ${len} exceeds the maximum ${def.len}.`);
    }
    let raw: string;
    if (def.type === "b") raw = textMode ? ascii(r.take(Math.ceil(len / 4), `field ${no}`)).toUpperCase() : toHex(r.take(Math.ceil(len / 8), `field ${no}`));
    else if (bcd && (def.type === "n" || def.type === "z")) { const hex = toHex(r.take(Math.ceil(len / 2), `field ${no}`)); raw = len % 2 ? (def.var ? hex.slice(0, len) : hex.slice(1)) : hex; }
    else if (bcd && def.type === "xn") { const sign = ascii(r.take(1, `field ${no} sign`)); raw = sign + toHex(r.take(Math.ceil(len / 2), `field ${no}`)).slice(-len); }
    else raw = ascii(r.take(def.type === "xn" ? len + 1 : len, `field ${no}`));
    fields.push({ no, def, raw });
  }
  return { mti, bitmapHex, fields, trailing: r.left };
}

const mask = (s: string) => (s.length <= 10 ? "*".repeat(s.length) : `${s.slice(0, 6)}${"*".repeat(s.length - 10)}${s.slice(-4)}`);

export function maskValue(no: number, raw: string): string {
  if (no === 2 || no === 34) return mask(raw);
  if (no === 35) { const [pan, rest] = raw.split(/[=D]/); return `${mask(pan!)}${rest !== undefined ? `${raw[pan!.length]}${"*".repeat(rest.length)}` : ""}`; }
  if (no === 45 || no === 36 || no === 52) return "*".repeat(raw.length);
  return raw;
}

function explain(no: number, raw: string, all: Map<number, string>): string {
  switch (no) {
    case 3: return `${PROCESSING[raw.slice(0, 2)] ?? "type " + raw.slice(0, 2)}; from ${ACCOUNT[raw.slice(2, 4)] ?? raw.slice(2, 4)}; to ${ACCOUNT[raw.slice(4, 6)] ?? raw.slice(4, 6)}`;
    case 4: case 5: case 6: {
      const cur = CURRENCY[all.get(no === 4 ? 49 : no === 5 ? 50 : 51) ?? ""];
      const exp = cur?.[1] ?? 2;
      const n = BigInt(raw);
      const s = exp ? `${n / 10n ** BigInt(exp)}.${(n % 10n ** BigInt(exp)).toString().padStart(exp, "0")}` : n.toString();
      return `${s}${cur ? ` ${cur[0]}` : " (assuming 2 decimals)"}`;
    }
    case 7: return `${raw.slice(0, 2)}-${raw.slice(2, 4)} ${raw.slice(4, 6)}:${raw.slice(6, 8)}:${raw.slice(8, 10)} (GMT, MM-DD hh:mm:ss)`;
    case 12: return `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4, 6)}`;
    case 13: case 15: case 16: case 17: return `${raw.slice(0, 2)}-${raw.slice(2, 4)} (MM-DD)`;
    case 14: return `20${raw.slice(0, 2)}-${raw.slice(2, 4)} (YY-MM)`;
    case 22: return `${ENTRY_MODE[raw.slice(0, 2)] ?? "entry " + raw.slice(0, 2)}; PIN capability ${raw[2] === "1" ? "yes" : raw[2] === "2" ? "no" : raw[2]}`;
    case 39: return RESPONSE[raw] ?? "network-specific code";
    case 49: case 50: case 51: return CURRENCY[raw]?.[0] ?? "";
    case 70: return ({ "001": "Sign-on", "002": "Sign-off", "161": "Key exchange", "301": "Echo test (heartbeat)", "101": "Key change" } as Record<string, string>)[raw] ?? "";
    case 90: return `original MTI ${raw.slice(0, 4)}, STAN ${raw.slice(4, 10)}, date/time ${raw.slice(10, 20)}`;
  }
  return "";
}

export function runIso8583Parser(input: string, options: Iso8583ParserOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let p: Parsed;
  try { p = parseIso8583(options.encoding === "ascii" ? input.trim() : input, options.encoding); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const all = new Map(p.fields.map((x) => [x.no, x.raw]));
  const m = p.mti;
  const out = [
    `MTI ${m}: ${MTI_VERSION[m[0]!] ?? "?"}, ${MTI_CLASS[m[1]!] ?? "?"} ${MTI_FUNCTION[m[2]!] ?? "?"} from ${MTI_ORIGIN[m[3]!] ?? "?"}`,
    `Bitmap ${p.bitmapHex}  (fields ${p.fields.map((x) => x.no).join(", ")})`,
    "",
  ];
  for (const fld of p.fields) {
    const shown = options.maskSensitive ? maskValue(fld.no, fld.raw) : fld.raw;
    const fmt = `${fld.def.type === "xn" ? "x+n" : fld.def.type}${fld.def.var ? ".".repeat(fld.def.var) : ""}${fld.def.len}`;
    const ex = explain(fld.no, fld.raw, all);
    out.push(`${String(fld.no).padStart(3)}  ${fld.def.name}  [${fmt}]\n     ${JSON.stringify(shown)}${ex ? `  ${ex}` : ""}`);
  }
  if (p.trailing) out.push("", `${p.trailing} unparsed trailing byte${p.trailing === 1 ? "" : "s"}: networks often redefine private fields (48, 60-63); check your spec.`);
  if (options.maskSensitive && [2, 35, 36, 45, 52].some((n) => all.has(n))) out.push("", "PAN, track and PIN data are masked. Never paste live card data into tools or tickets (PCI DSS).");
  return { output: out.join("\n"), error: null };
}
