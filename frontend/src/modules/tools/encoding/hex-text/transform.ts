import type { HexTextOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export function transformHexText(input: string, options: HexTextOptions): TransformResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    switch (options.mode) {
      case "text-to-hex":
        return { output: textToHex(input, options), error: null };
      case "hex-to-text":
        return { output: hexToText(input), error: null };
      case "text-to-binary":
        return { output: textToBinary(input), error: null };
      case "binary-to-text":
        return { output: binaryToText(input), error: null };
    }
  } catch (err) {
    return {
      output: "",
      error: { message: err instanceof Error ? err.message : "Conversion failed" },
    };
  }
}

const SEPARATORS: Record<HexTextOptions["hexSeparator"], string> = { none: "", space: " ", colon: ":", comma: ", " };

function textToHex(input: string, options: HexTextOptions): string {
  const bytes = new TextEncoder().encode(input);
  const prefix = !options.hexPrefix || options.hexPrefix === "none" ? "" : options.hexPrefix;
  const hexBytes = Array.from(bytes, (b) => {
    const h = b.toString(16).padStart(2, "0");
    return prefix + (options.hexUppercase ? h.toUpperCase() : h);
  });
  return hexBytes.join(SEPARATORS[options.hexSeparator] ?? " ");
}

function hexToText(input: string): string {
  const clean = input.replace(/0x|\\x|%/gi, "").replace(/[\s,:-]+/g, "");
  if (clean.length === 0) return "";
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("Input contains non-hexadecimal characters.");
  }
  if (clean.length % 2 !== 0) {
    throw new Error("Hex input must have an even number of digits.");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function textToBinary(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return Array.from(bytes, (b) => b.toString(2).padStart(8, "0")).join(" ");
}

function binaryToText(input: string): string {
  const clean = input.trim();
  if (clean.length === 0) return "";
  const groups = clean.split(/\s+/);
  const bits = groups.join("");
  if (!/^[01]+$/.test(bits)) {
    throw new Error("Input contains non-binary characters (expected only 0s and 1s).");
  }
  if (bits.length % 8 !== 0) {
    throw new Error("Binary input must be a multiple of 8 bits.");
  }
  const bytes = new Uint8Array(bits.length / 8);
  for (let i = 0; i < bits.length; i += 8) {
    bytes[i / 8] = parseInt(bits.slice(i, i + 8), 2);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
