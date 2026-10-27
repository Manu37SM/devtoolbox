import { describe, expect, it } from "vitest";
import { aesEncryptDecrypt, decryptText, encryptText } from "./transform";

const T = 30_000; // PBKDF2 with 600k iterations is deliberately slow
const enc = { mode: "encrypt", password: "correct horse" } as const;
const dec = { mode: "decrypt", password: "correct horse" } as const;

describe("AES-256-GCM with PBKDF2", () => {
  it("round-trips unicode text", async () => {
    const secret = "Müller → 日本語 🔐\nline 2";
    const packed = await encryptText(secret, "pw");
    expect(await decryptText(packed, "pw")).toBe(secret);
  }, T);

  it("uses a fresh salt and IV every time", async () => {
    const [a, b] = await Promise.all([encryptText("same", "pw"), encryptText("same", "pw")]);
    expect(a).not.toBe(b);
  }, T);

  it("rejects the wrong password", async () => {
    const packed = await encryptText("data", "right");
    await expect(decryptText(packed, "wrong")).rejects.toThrow(/wrong password/);
  }, T);

  it("detects tampering anywhere in the ciphertext", async () => {
    const packed = await encryptText("data", "pw");
    const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
    bytes[bytes.length - 1]! ^= 1;
    const tampered = btoa(String.fromCharCode(...bytes));
    await expect(decryptText(tampered, "pw")).rejects.toThrow(/altered/);
  }, T);

  it("rejects malformed input before doing any expensive work", async () => {
    await expect(decryptText("%%%", "pw")).rejects.toThrow(/Base64/);
    await expect(decryptText("AAAA", "pw")).rejects.toThrow(/too short/);
    const wrongVersion = btoa(String.fromCharCode(9, ...new Array(60).fill(0)));
    await expect(decryptText(wrongVersion, "pw")).rejects.toThrow(/Unrecognised format/);
  });
});

describe("aesEncryptDecrypt", () => {
  it("produces text that decrypts through the same entry point", async () => {
    const e = await aesEncryptDecrypt("hello", enc);
    expect(e.error).toBeNull();
    expect((await aesEncryptDecrypt(` ${e.output}\n`, dec)).output).toBe("hello");
  }, T);

  it("requires a password and handles empty input", async () => {
    expect((await aesEncryptDecrypt("x", { ...enc, password: "" })).error?.message).toMatch(/password/);
    expect(await aesEncryptDecrypt(" ", enc)).toEqual({ output: "", error: null });
  });

  it("reports a friendly error for wrong passwords", async () => {
    const e = await aesEncryptDecrypt("hello", enc);
    expect((await aesEncryptDecrypt(e.output, { ...dec, password: "nope" })).error?.message).toMatch(/Decryption failed/);
  }, T);
});
