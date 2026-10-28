import type { TransformResult } from "@/lib/tool-transform";
import type { HexDumpViewerOptions } from "./schema";

function parseHexBytes(s: string): Uint8Array {
  const clean = s.replace(/0x/gi, "").replace(/[\s,:-]+/g, "");
  if (clean.length % 2 || /[^0-9a-f]/i.test(clean)) throw new Error("Hex input must contain an even number of hex digits");
  return Uint8Array.from(clean.match(/../g) ?? [], (x) => parseInt(x, 16));
}

export function hexDump(bytes: Uint8Array, perLine: number, upper: boolean): string {
  const lines: string[] = [];
  for (let off = 0; off < bytes.length; off += perLine) {
    const chunk = bytes.slice(off, off + perLine);
    const hex: string[] = [];
    for (let i = 0; i < perLine; i++) {
      const cell = i < chunk.length ? chunk[i]!.toString(16).padStart(2, "0") : "  ";
      hex.push(upper ? cell.toUpperCase() : cell);
    }
    const groups: string[] = [];
    for (let i = 0; i < hex.length; i += 2) groups.push(hex.slice(i, i + 2).join(""));
    const ascii = Array.from(chunk, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".")).join("");
    const offset = off.toString(16).padStart(8, "0");
    lines.push(`${upper ? offset.toUpperCase() : offset}: ${groups.join(" ")}  ${ascii}`);
  }
  return lines.join("\n");
}

/** Reads xxd-style output (offset: hex groups  ascii) and returns the bytes. */
export function parseHexDump(dump: string): Uint8Array {
  const out: number[] = [];
  for (const raw of dump.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(?:[0-9a-f]+:)?\s*((?:[0-9a-f]{2,}\s?)+?)(?:\s{2,}.*)?$/i.exec(line);
    if (!m) throw new Error(`Cannot read dump line: ${line.slice(0, 40)}`);
    out.push(...parseHexBytes(m[1]!));
  }
  return Uint8Array.from(out);
}

export function viewHexDump(input: string, options: HexDumpViewerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    if (options.direction === "parse") {
      const bytes = parseHexDump(input);
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");
      let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { text = "(not valid UTF-8)"; }
      return { output: `Bytes: ${bytes.length}\nHex:   ${options.uppercase ? hex.toUpperCase() : hex}\nText:  ${JSON.stringify(text)}`, error: null };
    }
    const bytes = options.inputFormat === "hex" ? parseHexBytes(input) : new TextEncoder().encode(input);
    return { output: `${hexDump(bytes, options.bytesPerLine, options.uppercase)}\n\n${bytes.length} byte${bytes.length === 1 ? "" : "s"}`, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
