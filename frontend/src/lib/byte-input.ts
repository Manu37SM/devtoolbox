/** Shared parsing for tools that take binary data as hex, base64/base64url or PEM text. */
export type ByteInputMode = "auto" | "hex" | "base64";

export function hexToBytes(text: string): Uint8Array {
  const h = text.replace(/0x/gi, "").replace(/[\s:,-]+/g, "");
  if (!/^[0-9a-fA-F]*$/.test(h)) throw new Error("Hex input contains non-hex characters.");
  if (h.length % 2) throw new Error("Hex input has an odd number of digits.");
  const out = new Uint8Array(h.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function base64ToBytes(text: string): Uint8Array {
  let b = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b)) throw new Error("Base64 input contains invalid characters.");
  b = b.replace(/=+$/, "");
  if (b.length % 4 === 1) throw new Error("Base64 input has an invalid length.");
  b += "=".repeat((4 - (b.length % 4)) % 4);
  const bin = atob(b);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function bytesToHex(b: Uint8Array, sep = ""): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join(sep).toUpperCase();
}

export function bytesToBase64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Strips PEM armour if present, then decodes hex or base64 (auto picks hex when the text is only hex digits). */
export function parseByteInput(text: string, mode: ByteInputMode = "auto"): Uint8Array {
  let t = text.trim();
  const pem = /-----BEGIN [^-]+-----([\s\S]*?)-----END [^-]+-----/.exec(t);
  if (pem) return base64ToBytes(pem[1]!.replace(/^[\w-]+:.*$/gm, ""));
  if (mode === "hex") return hexToBytes(t);
  if (mode === "base64") return base64ToBytes(t);
  t = t.replace(/^0x/i, "");
  const compact = t.replace(/[\s:,-]+/g, "");
  if (/^[0-9a-fA-F]+$/.test(compact) && compact.length % 2 === 0) return hexToBytes(t);
  return base64ToBytes(t);
}
