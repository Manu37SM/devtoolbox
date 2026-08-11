// Curated, self-contained transforms for the browser extension's context
// menu. Deliberately NOT imported from frontend/src/modules/tools/*/transform.ts
// — those are pure by contract (CLAUDE.md rule 3) but live behind Next.js
// path aliases/tooling not meant to cross into this package's esbuild
// pipeline. Same precedent as the Public API's hash/json-validate endpoints
// (see AUDIT_REPORT.md §14.1 and §16). Zero DOM dependency — pure string in,
// string out (or throws), same discipline as any transform.ts in the app.

export interface TransformResult {
  ok: boolean;
  output: string;
}

export function formatJson(input: string): TransformResult {
  try {
    const parsed: unknown = JSON.parse(input);
    return { ok: true, output: JSON.stringify(parsed, null, 2) };
  } catch (err) {
    return { ok: false, output: `Invalid JSON: ${(err as Error).message}` };
  }
}

export function base64Encode(input: string): TransformResult {
  try {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { ok: true, output: btoa(binary) };
  } catch (err) {
    return { ok: false, output: `Could not encode: ${(err as Error).message}` };
  }
}

export function base64Decode(input: string): TransformResult {
  try {
    const binary = atob(input.trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { ok: true, output: new TextDecoder().decode(bytes) };
  } catch (err) {
    return { ok: false, output: `Invalid Base64: ${(err as Error).message}` };
  }
}

export function urlEncode(input: string): TransformResult {
  try {
    return { ok: true, output: encodeURIComponent(input) };
  } catch (err) {
    return { ok: false, output: `Could not encode: ${(err as Error).message}` };
  }
}

export function urlDecode(input: string): TransformResult {
  try {
    return { ok: true, output: decodeURIComponent(input) };
  } catch (err) {
    return { ok: false, output: `Invalid URL encoding: ${(err as Error).message}` };
  }
}

// Decodes only — never verifies signatures (no key material available
// client-side, and verification isn't the point of a clipboard utility).
// Output is clearly labeled as unverified so it can't be mistaken for a
// trust decision.
export function jwtDecode(input: string): TransformResult {
  const parts = input.trim().split(".");
  const [headerPart, payloadPart] = parts;
  if (parts.length < 2 || !headerPart || !payloadPart) {
    return { ok: false, output: "Not a JWT (expected at least header.payload)" };
  }
  try {
    const decodePart = (part: string): unknown => {
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    };
    const header = decodePart(headerPart);
    const payload = decodePart(payloadPart);
    return {
      ok: true,
      output: `// Header (unverified)\n${JSON.stringify(header, null, 2)}\n\n// Payload (unverified — signature not checked)\n${JSON.stringify(payload, null, 2)}`,
    };
  } catch (err) {
    return { ok: false, output: `Invalid JWT: ${(err as Error).message}` };
  }
}

export type ToolId = "json-format" | "base64-encode" | "base64-decode" | "url-encode" | "url-decode" | "jwt-decode";

export const TOOLS: { id: ToolId; label: string; run: (input: string) => TransformResult }[] = [
  { id: "json-format", label: "Format JSON", run: formatJson },
  { id: "base64-encode", label: "Base64 Encode", run: base64Encode },
  { id: "base64-decode", label: "Base64 Decode", run: base64Decode },
  { id: "url-encode", label: "URL Encode", run: urlEncode },
  { id: "url-decode", label: "URL Decode", run: urlDecode },
  { id: "jwt-decode", label: "Decode JWT (unverified)", run: jwtDecode },
];
