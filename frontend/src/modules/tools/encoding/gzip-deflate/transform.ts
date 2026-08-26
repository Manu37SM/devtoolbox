import type { GzipDeflateOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

export async function compressText(input: string, options: GzipDeflateOptions): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    if (options.mode === "compress") {
      const inputBytes = new TextEncoder().encode(input);
      const compressed = await runStream(inputBytes, new CompressionStream(options.format));
      return { output: bytesToBase64(compressed), error: null };
    }

    const inputBytes = base64ToBytes(input);
    const decompressed = await runStream(inputBytes, new DecompressionStream(options.format));
    return { output: new TextDecoder("utf-8", { fatal: false }).decode(decompressed), error: null };
  } catch (err) {

    const caughtMessage = err instanceof Error ? err.message : "";
    return {
      output: "",
      error: {
        message:
          caughtMessage.length > 0
            ? caughtMessage
            : options.mode === "compress"
              ? "Failed to compress input"
              : "Failed to decompress input — is it valid base64-encoded compressed data?",
      },
    };
  }
}

async function runStream(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const source = Uint8Array.from(bytes);
  const writer = stream.writable.getWriter();
  try {
    await writer.write(source);
    await writer.close();
  } catch (err) {
    await writer.abort(err);
    throw err;
  }
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buffer);
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/\s+/g, "");
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
