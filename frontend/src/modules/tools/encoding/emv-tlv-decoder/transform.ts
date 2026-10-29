import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex, parseByteInput } from "@/lib/byte-input";
import type { EmvTlvDecoderOptions } from "./schema";
import { AIP_BITS, COUNTRY, CURRENCY, CVM_METHOD, TAGS, TSI_BITS, TVR_BITS } from "./tags";

export interface Tlv { tag: string; offset: number; length: number; value: Uint8Array; constructed: boolean; children: Tlv[] }

export function parseTlv(b: Uint8Array, start = 0, end = b.length, depth = 0): Tlv[] {
  const out: Tlv[] = [];
  let p = start;
  while (p < end) {
    if (b[p] === 0x00 || b[p] === 0xff) { p++; continue; }
    const offset = p;
    const first = b[p++]!;
    let tag = [first];
    if ((first & 0x1f) === 0x1f) {
      do { if (p >= end) throw new Error(`Truncated tag at offset ${offset}`); tag.push(b[p]!); } while (b[p++]! & 0x80);
    }
    if (p >= end) throw new Error(`Missing length for tag ${bytesToHex(Uint8Array.from(tag))} at offset ${offset}`);
    let len = b[p++]!;
    if (len & 0x80) {
      const n = len & 0x7f;
      if (n === 0 || n > 3) throw new Error(`Unsupported length encoding at offset ${p - 1}`);
      len = 0;
      for (let i = 0; i < n; i++) { if (p >= end) throw new Error(`Truncated length at offset ${offset}`); len = (len << 8) | b[p++]!; }
    }
    if (p + len > end) throw new Error(`Tag ${bytesToHex(Uint8Array.from(tag))} at offset ${offset} declares ${len} bytes but only ${end - p} remain`);
    const constructed = (first & 0x20) !== 0;
    const t: Tlv = { tag: bytesToHex(Uint8Array.from(tag)), offset, length: len, value: b.subarray(p, p + len), constructed, children: [] };
    if (constructed && depth < 10) t.children = parseTlv(b, p, p + len, depth + 1);
    out.push(t);
    p += len;
    tag = [];
  }
  return out;
}

const ascii = (v: Uint8Array) => String.fromCharCode(...v).replace(/[^\x20-\x7e]/g, ".");
const maskPan = (s: string) => (s.length <= 10 ? "*".repeat(s.length) : `${s.slice(0, 6)}${"*".repeat(s.length - 10)}${s.slice(-4)}`);

function bits(v: Uint8Array, names: string[][]): string[] {
  const out: string[] = [];
  names.forEach((byteNames, i) => {
    const byte = v[i] ?? 0;
    byteNames.forEach((name, bit) => { if (byte & (0x80 >> bit) && name !== "RFU") out.push(`byte ${i + 1} b${8 - bit}: ${name}`); });
  });
  return out;
}

const date = (d: string) => (/^\d{6}$/.test(d) ? `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}` : d);

export function describeTag(t: Tlv, mask: boolean, explain: boolean): { value: string; notes: string[] } {
  const fmt = TAGS[t.tag]?.[1] ?? "b";
  const hex = bytesToHex(t.value);
  const notes: string[] = [];
  let value = fmt === "an" || fmt === "ans" ? JSON.stringify(ascii(t.value)) : hex;
  switch (t.tag) {
    case "5A": { const pan = hex.replace(/F+$/, ""); value = mask ? maskPan(pan) : pan; break; }
    case "57": case "9F6B": {
      const [pan, rest] = hex.split("D");
      value = mask ? `${maskPan(pan!)}D${"*".repeat((rest ?? "").replace(/F$/, "").length)}` : hex;
      if (rest && rest.length >= 7) notes.push(`expiry 20${rest.slice(0, 2)}-${rest.slice(2, 4)}, service code ${rest.slice(4, 7)}`);
      break;
    }
    case "5F20": case "9F0B": if (mask) value = `"${"*".repeat(t.value.length)}" (${t.value.length} characters, masked)`; break;
    case "9A": case "5F24": case "5F25": notes.push(date(hex)); break;
    case "9F21": notes.push(`${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`); break;
    case "9F02": case "9F03": notes.push(`${Number(hex.slice(0, -2))}.${hex.slice(-2)} (minor units assume exponent 2)`); break;
    case "5F2A": case "9F42": case "9F3C": if (CURRENCY[hex]) notes.push(CURRENCY[hex]!); break;
    case "9F1A": case "5F28": if (COUNTRY[hex]) notes.push(COUNTRY[hex]!); break;
    case "9C": notes.push(({ "00": "Purchase", "01": "Cash", "09": "Purchase with cashback", "20": "Refund", "30": "Balance inquiry", "31": "Balance inquiry" } as Record<string, string>)[hex] ?? ""); break;
    case "9F27": { const c = (t.value[0] ?? 0) >> 6; notes.push(["AAC (declined offline)", "TC (approved offline)", "ARQC (online authorisation requested)", "RFU"][c]!); break; }
    case "9F36": notes.push(`ATC ${parseInt(hex || "0", 16)}`); break;
    case "9F34": { const m = (t.value[0] ?? 0) & 0x3f; notes.push(`${CVM_METHOD[m] ?? `method ${m.toString(16)}`}${t.value[0]! & 0x40 ? " (apply next CVM if unsuccessful)" : ""}; result ${["unknown", "failed", "successful"][t.value[2] ?? 0] ?? hex.slice(4)}`); break; }
  }
  if (explain) {
    if (t.tag === "95") { const b = bits(t.value, TVR_BITS); notes.push(...(b.length ? b : ["no TVR bits set"])); }
    if (t.tag === "9B") notes.push(...bits(t.value, TSI_BITS));
    if (t.tag === "82") notes.push(...bits(t.value, AIP_BITS));
  }
  return { value, notes: notes.filter(Boolean) };
}

export function runEmvTlvDecoder(input: string, options: EmvTlvDecoderOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let tlvs: Tlv[];
  try { tlvs = parseTlv(parseByteInput(input, "hex")); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const lines: string[] = [];
  let sensitive = false;
  const walk = (list: Tlv[], depth: number) => {
    for (const t of list) {
      const pad = "  ".repeat(depth);
      const name = TAGS[t.tag]?.[0] ?? (t.tag.startsWith("DF") || t.tag.startsWith("9F7") ? "Proprietary / scheme-specific" : "Unknown tag");
      if (["5A", "57", "9F6B", "5F20", "56"].includes(t.tag)) sensitive = true;
      if (t.constructed) {
        lines.push(`${pad}${t.tag} ${name} (${t.length} bytes)`);
        walk(t.children, depth + 1);
        continue;
      }
      const d = describeTag(t, options.maskSensitive, options.explainBits);
      lines.push(`${pad}${t.tag} ${name} [${t.length}]: ${d.value}`);
      for (const n of d.notes) lines.push(`${pad}    ${n}`);
    }
  };
  walk(tlvs, 0);
  if (sensitive && options.maskSensitive) lines.push("", "PAN, track and cardholder name are masked. Card data in logs or tickets falls under PCI DSS.");
  return { output: lines.join("\n"), error: null };
}
