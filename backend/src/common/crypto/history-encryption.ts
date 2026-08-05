import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM at-rest encryption for HistoryEntry.inputPreview/outputPreview
// per DATABASE.md §3's comment on that table ("Encrypted at rest ... since
// this is the one table that *can* contain arbitrary user tool input if
// sync is enabled"). Single server-wide key (HISTORY_ENCRYPTION_KEY,
// base64, 32 raw bytes) rather than a true per-user derived key — DATABASE.md
// says "key derived per-user" but that requires a KMS/per-user-key-wrapping
// scheme this pass doesn't build; a single AES-256-GCM key with a random IV
// per record is the conventional interim default. Documented deviation,
// tracked as a follow-up in AUDIT_REPORT.md.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    // Also accept a plain 32-char utf8 secret for convenience in local dev.
    const utf8Key = Buffer.from(rawKey, "utf8");
    if (utf8Key.length === 32) return utf8Key;
    throw new Error("HISTORY_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 32-char plain string).");
  }
  return key;
}

/** Returns null unencrypted for null/undefined input (nothing to store). */
export function encryptPreview(rawKey: string, plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = getKey(rawKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptPreview(rawKey: string, stored: string | null): string | null {
  if (stored == null) return null;
  const key = getKey(rawKey);
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
