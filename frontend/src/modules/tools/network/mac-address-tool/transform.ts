import type { TransformResult } from "@/lib/tool-transform";
import type { MacAddressToolOptions } from "./schema";

export function parseMac(text: string): Uint8Array {
  const hex = text.trim().replace(/[:\-.\s]/g, "");
  if (!/^[0-9a-fA-F]{12}$/.test(hex)) throw new Error(`"${text.trim()}" isn't a MAC address (12 hex digits).`);
  return Uint8Array.from(hex.match(/../g)!.map((h) => parseInt(h, 16)));
}

export function formatMac(bytes: Uint8Array, style: MacAddressToolOptions["style"], upper: boolean): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  let out: string;
  switch (style) {
    case "hyphen": out = hex.join("-"); break;
    case "cisco": out = [hex[0]! + hex[1]!, hex[2]! + hex[3]!, hex[4]! + hex[5]!].join("."); break;
    case "plain": out = hex.join(""); break;
    default: out = hex.join(":");
  }
  return upper ? out.toUpperCase() : out;
}

export function describeMac(bytes: Uint8Array): string {
  const multicast = (bytes[0]! & 1) === 1;
  const local = (bytes[0]! & 2) === 2;
  const oui = Array.from(bytes.slice(0, 3), (b) => b.toString(16).padStart(2, "0").toUpperCase()).join("-");
  return `${multicast ? "multicast" : "unicast"}, ${local ? "locally administered" : "universally administered"}, OUI ${oui}`;
}

export function randomMac(local: boolean, rand: (n: number) => Uint8Array = defaultRandom): Uint8Array {
  const b = rand(6);
  b[0] = (b[0]! & 0b11111100) | (local ? 0b10 : 0); // clear multicast bit, set/clear local bit
  return b;
}

function defaultRandom(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export function macAddressTool(input: string, options: MacAddressToolOptions, _nonce = 0): TransformResult {
  if (options.mode === "generate") {
    const count = Math.max(1, Math.min(500, Math.floor(options.count)));
    const lines = Array.from({ length: count }, () => {
      const mac = randomMac(options.localAdmin);
      return formatMac(mac, options.style, options.upper);
    });
    return { output: lines.join("\n"), error: null };
  }
  const lines = input.split(/\r?\n|,/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  try {
    const out = lines.map((l) => {
      const mac = parseMac(l);
      const formatted = formatMac(mac, options.style, options.upper);
      return options.details ? `${formatted}  (${describeMac(mac)})` : formatted;
    });
    return { output: out.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Invalid MAC address." } };
  }
}
