import { decryptPreview, encryptPreview } from "./history-encryption";

// 32-byte key, base64-encoded — same shape HISTORY_ENCRYPTION_KEY must be.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");

describe("encryptPreview / decryptPreview", () => {
  it("round-trips plaintext", () => {
    const plaintext = '{"input":"hello","nested":{"a":1}}';
    const encrypted = encryptPreview(TEST_KEY, plaintext);
    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(plaintext);
    expect(decryptPreview(TEST_KEY, encrypted)).toBe(plaintext);
  });

  it("passes through null/undefined as null", () => {
    expect(encryptPreview(TEST_KEY, null)).toBeNull();
    expect(encryptPreview(TEST_KEY, undefined)).toBeNull();
    expect(decryptPreview(TEST_KEY, null)).toBeNull();
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptPreview(TEST_KEY, "same text");
    const b = encryptPreview(TEST_KEY, "same text");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong key (auth tag mismatch)", () => {
    const otherKey = Buffer.alloc(32, 9).toString("base64");
    const encrypted = encryptPreview(TEST_KEY, "secret");
    expect(() => decryptPreview(otherKey, encrypted)).toThrow();
  });

  it("accepts a 32-char plain-string key as a dev-convenience fallback", () => {
    const plainKey = "a".repeat(32);
    const encrypted = encryptPreview(plainKey, "hi");
    expect(decryptPreview(plainKey, encrypted)).toBe("hi");
  });

  it("throws for a key that decodes to neither 32 bytes base64 nor 32 chars", () => {
    expect(() => encryptPreview("too-short", "hi")).toThrow();
  });
});
