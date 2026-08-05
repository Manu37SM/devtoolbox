import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// AES-256-GCM at-rest encryption for HistoryEntry.inputPreview/outputPreview
// per DATABASE.md §3's comment on that table ("Encrypted at rest ... since
// this is the one table that *can* contain arbitrary user tool input if
// sync is enabled").
//
// Per-user key derivation: rather than encrypting every user's history
// under one shared AES key, each record is encrypted under a key derived
// from the single master secret (HISTORY_ENCRYPTION_KEY) via HKDF, using
// the owning user's id as the derivation "info" parameter. This resolves
// DATABASE.md §3's "key derived per-user" — it's not full per-user KMS
// key-wrapping (rotating/revoking one user's key independently still
// isn't possible without re-deriving from the same master secret), but it
// does mean a leaked *derived* key only ever decrypts that one user's
// history, not everyone's, and there's no shared ciphertext-analysis
// surface across users. A true KMS-backed per-user scheme (independently
// rotatable/revocable keys) remains a larger follow-up, tracked in
// AUDIT_REPORT.md.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const HKDF_DIGEST = "sha256";
// Fixed, non-secret context string — HKDF's "info" parameter just needs to
// be distinct per use-case so this derivation can never collide with some
// other future HKDF use of the same master key; it is not itself a secret.
const HKDF_INFO_PREFIX = "devtoolbox:history-entry:";

function getMasterKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {
    // Also accept a plain 32-char utf8 secret for convenience in local dev.
    const utf8Key = Buffer.from(rawKey, "utf8");
    if (utf8Key.length === 32) return utf8Key;
    throw new Error("HISTORY_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 32-char plain string).");
  }
  return key;
}

function deriveUserKey(rawMasterKey: string, userId: string): Buffer {
  const masterKey = getMasterKey(rawMasterKey);
  const derived = hkdfSync(HKDF_DIGEST, masterKey, Buffer.alloc(0), `${HKDF_INFO_PREFIX}${userId}`, 32);
  return Buffer.from(derived);
}

/** Returns null unencrypted for null/undefined input (nothing to store). */
export function encryptPreview(rawMasterKey: string, userId: string, plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = deriveUserKey(rawMasterKey, userId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptPreview(rawMasterKey: string, userId: string, stored: string | null): string | null {
  if (stored == null) return null;
  const key = deriveUserKey(rawMasterKey, userId);
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
