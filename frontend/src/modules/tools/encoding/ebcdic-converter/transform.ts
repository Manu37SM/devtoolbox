import type { TransformResult } from "@/lib/tool-transform";
import { bytesToHex, parseByteInput } from "@/lib/byte-input";
import type { EbcdicConverterOptions } from "./schema";
import { CODE_PAGES } from "./codepages";

const reverse = new Map<string, Map<string, number>>();
function encoder(cp: string): Map<string, number> {
  let m = reverse.get(cp);
  if (!m) { m = new Map([...CODE_PAGES[cp]!].map((ch, i) => [ch, i])); reverse.set(cp, m); }
  return m;
}

/** newline "nl": \n <-> 0x15 (NEL, z/OS convention); "lf": \n <-> 0x25. */
export function toEbcdic(text: string, cp: string, newline: "nl" | "lf"): { bytes: Uint8Array; unmappable: string[] } {
  const enc = encoder(cp);
  const out: number[] = [];
  const bad = new Set<string>();
  for (const ch of text.replace(/\r\n/g, "\n")) {
    if (ch === "\n") { out.push(newline === "nl" ? 0x15 : 0x25); continue; }
    const b = enc.get(ch);
    if (b === undefined) { bad.add(ch); out.push(0x6f); continue; }
    out.push(b);
  }
  return { bytes: Uint8Array.from(out), unmappable: [...bad] };
}

export function fromEbcdic(bytes: Uint8Array, cp: string, newline: "nl" | "lf"): string {
  const table = CODE_PAGES[cp]!;
  let s = "";
  for (const b of bytes) s += (newline === "nl" && b === 0x15) || (newline === "lf" && b === 0x25) ? "\n" : table[b]!;
  return s;
}

const visible = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, (c) => `\\x${c.charCodeAt(0).toString(16).padStart(2, "0")}`);

export function runEbcdicConverter(input: string, options: EbcdicConverterOptions): TransformResult {
  if (!input) return { output: "", error: null };
  if (options.direction === "to-ebcdic") {
    const { bytes, unmappable } = toEbcdic(input, options.codePage, options.newline);
    const hex = bytesToHex(bytes, " ");
    const lines = hex.match(/.{1,48}/g)?.map((l) => l.trim()) ?? [];
    return { output: `${lines.join("\n")}${unmappable.length ? `\n\nNot in code page ${options.codePage} (written as 0x6F "?"): ${unmappable.map((c) => JSON.stringify(c)).join(" ")}` : ""}`, error: null };
  }
  let bytes: Uint8Array;
  try { bytes = parseByteInput(input, "hex"); } catch (e) { return { output: "", error: { message: `${(e as Error).message} Paste EBCDIC data as hex bytes.` } }; }
  return { output: visible(fromEbcdic(bytes, options.codePage, options.newline)), error: null };
}
