import { describe, expect, it } from "vitest";
import { hashFile, hashText } from "./transform";

describe("hashText", () => {
  it("computes MD5", async () => {
    const result = await hashText("hello", { algorithm: "MD5", uppercase: false });
    expect(result.error).toBeNull();
    expect(result.output).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("computes SHA-1", async () => {
    const result = await hashText("hello", { algorithm: "SHA-1", uppercase: false });
    expect(result.output).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("computes SHA-256", async () => {
    const result = await hashText("hello", { algorithm: "SHA-256", uppercase: false });
    expect(result.output).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("computes SHA-512", async () => {
    const result = await hashText("hello", { algorithm: "SHA-512", uppercase: false });
    expect(result.output).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7" +
        "acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });

  it("uppercases output when requested", async () => {
    const result = await hashText("hello", { algorithm: "MD5", uppercase: true });
    expect(result.output).toBe("5D41402ABC4B2A76B9719D911017C592".slice(0, 32));
  });

  it("returns empty output for empty input", async () => {
    const result = await hashText("", { algorithm: "SHA-256", uppercase: false });
    expect(result).toEqual({ output: "", error: null });
  });

  it("produces stable digests for longer input", async () => {
    const longInput = "a".repeat(10_000);
    const result = await hashText(longInput, { algorithm: "SHA-256", uppercase: false });
    expect(result.output).toHaveLength(64);
  });
});

describe("hashFile", () => {
  it("hashes a file's bytes identically to hashing the same text", async () => {
    const file = new File(["hello"], "greeting.txt", { type: "text/plain" });
    const fromFile = await hashFile(file, { algorithm: "SHA-256", uppercase: false });
    const fromText = await hashText("hello", { algorithm: "SHA-256", uppercase: false });
    expect(fromFile.error).toBeNull();
    expect(fromFile.output).toBe(fromText.output);
  });

  it("hashes an empty file", async () => {
    const file = new File([], "empty.txt");
    const result = await hashFile(file, { algorithm: "SHA-256", uppercase: false });
    expect(result.error).toBeNull();
    // An empty file hashes to SHA-256's known empty-input digest, distinct
    // from `hashText("")`'s early-return `{ output: "", error: null }" —
    // an empty *file* is still a real (zero-byte) input worth hashing.
    expect(result.output).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("respects the uppercase and algorithm options", async () => {
    const file = new File(["hello"], "greeting.txt");
    const result = await hashFile(file, { algorithm: "MD5", uppercase: true });
    expect(result.output).toBe(result.output.toUpperCase());
    expect(result.output).toHaveLength(32);
  });
});
