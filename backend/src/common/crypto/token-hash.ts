import { createHash, randomBytes } from "node:crypto";

/**
 * Generates a random opaque token (returned to the client / put in an
 * email link) and its SHA-256 hash (what actually gets stored in Postgres
 * — refresh tokens and email-verify/password-reset tokens are never
 * persisted in plaintext, per DATABASE.md §3 Session.refreshTokenHash and
 * the same convention extended to VerificationToken).
 */
export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** IP addresses are stored hashed, never raw, for abuse-detection use only
 * (DATABASE.md §3 Session.ipHash / §4 privacy notes). */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
