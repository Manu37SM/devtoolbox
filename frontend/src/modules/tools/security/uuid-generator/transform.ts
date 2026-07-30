import type { UuidGeneratorOptions } from "./schema";

/** Generates UUIDs using the platform CSPRNG (`crypto.getRandomValues`),
 * available in browsers, Node (Vitest), and Workers alike. Accepts an
 * injectable random source purely for deterministic testing. */
export function generateUuids(
  options: UuidGeneratorOptions,
  randomBytes: (length: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string[] {
  const results: string[] = [];
  for (let i = 0; i < options.count; i++) {
    const uuid = options.version === "v4" ? uuidV4(randomBytes) : uuidV7(randomBytes);
    results.push(formatUuid(uuid, options));
  }
  return results;
}

function formatUuid(uuid: string, options: UuidGeneratorOptions): string {
  const value = options.hyphens ? uuid : uuid.replace(/-/g, "");
  return options.uppercase ? value.toUpperCase() : value;
}

function uuidV4(randomBytes: (length: number) => Uint8Array): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytesToUuidString(bytes);
}

function uuidV7(randomBytes: (length: number) => Uint8Array): string {
  const bytes = randomBytes(16);
  const now = BigInt(Date.now());
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytesToUuidString(bytes);
}

function bytesToUuidString(bytes: Uint8Array): string {
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Detects the UUID version/variant from an existing UUID string, for the
 * "Inspector" half of the tool. */
export function inspectUuid(input: string): { version: number | null; variant: string | null; valid: boolean } {
  const match = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(
    input.trim(),
  );
  if (!match) return { version: null, variant: null, valid: false };

  const versionNibble = parseInt(match[3]![0]!, 16);
  const variantNibble = parseInt(match[4]![0]!, 16);
  const variant = variantNibble >= 8 && variantNibble <= 11 ? "RFC 4122" : "unknown/legacy";

  return { version: versionNibble, variant, valid: true };
}
