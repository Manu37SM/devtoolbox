import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const HKDF_DIGEST = "sha256";
const HKDF_INFO_PREFIX = "devtoolbox:sso-connection:";

function getMasterKey(rawKey: string): Buffer {
  const key = Buffer.from(rawKey, "base64");
  if (key.length !== 32) {

    const utf8Key = Buffer.from(rawKey, "utf8");
    if (utf8Key.length === 32) return utf8Key;
    throw new Error("SSO_SECRET_ENCRYPTION_KEY must decode to exactly 32 bytes (base64 or 32-char plain string).");
  }
  return key;
}

function deriveOrgKey(rawMasterKey: string, organizationId: string): Buffer {
  const masterKey = getMasterKey(rawMasterKey);
  const derived = hkdfSync(HKDF_DIGEST, masterKey, Buffer.alloc(0), `${HKDF_INFO_PREFIX}${organizationId}`, 32);
  return Buffer.from(derived);
}

export function encryptSecret(rawMasterKey: string, organizationId: string, plaintext: string | null | undefined): string | null {
  if (plaintext == null) return null;
  const key = deriveOrgKey(rawMasterKey, organizationId);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptSecret(rawMasterKey: string, organizationId: string, stored: string | null): string | null {
  if (stored == null) return null;
  const key = deriveOrgKey(rawMasterKey, organizationId);
  const buf = Buffer.from(stored, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buf.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
