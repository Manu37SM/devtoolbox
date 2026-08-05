import { decryptPreview, encryptPreview } from "./history-encryption";

// 32-byte key, base64-encoded — same shape HISTORY_ENCRYPTION_KEY must be.
const TEST_KEY = Buffer.alloc(32, 7).toString("base64");
const USER_A = "user-aaaa";
const USER_B = "user-bbbb";

describe("encryptPreview / decryptPreview", () => {
  it("round-trips plaintext", () => {
    const plaintext = '{"input":"hello","nested":{"a":1}}';
    const encrypted = encryptPreview(TEST_KEY, USER_A, plaintext);
    expect(encrypted).not.toBeNull();
    expect(encrypted).not.toBe(plaintext);
    expect(decryptPreview(TEST_KEY, USER_A, encrypted)).toBe(plaintext);
  });

  it("passes through null/undefined as null", () => {
    expect(encryptPreview(TEST_KEY, USER_A, null)).toBeNull();
    expect(encryptPreview(TEST_KEY, USER_A, undefined)).toBeNull();
    expect(decryptPreview(TEST_KEY, USER_A, null)).toBeNull();
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptPreview(TEST_KEY, USER_A, "same text");
    const b = encryptPreview(TEST_KEY, USER_A, "same text");
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong master key (auth tag mismatch)", () => {
    const otherKey = Buffer.alloc(32, 9).toString("base64");
    const encrypted = encryptPreview(TEST_KEY, USER_A, "secret");
    expect(() => decryptPreview(otherKey, USER_A, encrypted)).toThrow();
  });

  it("derives a different key per user — one user's ciphertext can't be decrypted as another's", () => {
    const encrypted = encryptPreview(TEST_KEY, USER_A, "secret");
    expect(() => decryptPreview(TEST_KEY, USER_B, encrypted)).toThrow();
  });

  it("accepts a 32-char plain-string key as a dev-convenience fallback", () => {
    const plainKey = "a".repeat(32);
    const encrypted = encryptPreview(plainKey, USER_A, "hi");
    expect(decryptPreview(plainKey, USER_A, encrypted)).toBe("hi");
  });

  it("throws for a key that decodes to neither 32 bytes base64 nor 32 chars", () => {
    expect(() => encryptPreview("too-short", USER_A, "hi")).toThrow();
  });
});
