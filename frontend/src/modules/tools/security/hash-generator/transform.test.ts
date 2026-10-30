import { describe, expect, it } from "vitest";
import { hashFile, hashText } from "./transform";
import type { HashGeneratorOptions } from "./schema";

describe("hashText", () => {
  it("computes MD5", async () => {
    const result = await hashText("hello", { algorithm: "MD5", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.error).toBeNull();
    expect(result.output).toBe("5d41402abc4b2a76b9719d911017c592");
  });

  it("computes SHA-1", async () => {
    const result = await hashText("hello", { algorithm: "SHA-1", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toBe("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d");
  });

  it("computes SHA-256", async () => {
    const result = await hashText("hello", { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("computes SHA-512", async () => {
    const result = await hashText("hello", { algorithm: "SHA-512", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toBe(
      "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7" +
        "acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043",
    );
  });

  it("uppercases output when requested", async () => {
    const result = await hashText("hello", { algorithm: "MD5", uppercase: true, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toBe("5D41402ABC4B2A76B9719D911017C592".slice(0, 32));
  });

  it("returns empty output for empty input", async () => {
    const result = await hashText("", { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result).toEqual({ output: "", error: null });
  });

  it("produces stable digests for longer input", async () => {
    const longInput = "a".repeat(10_000);
    const result = await hashText(longInput, { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toHaveLength(64);
  });
});

describe("hashFile", () => {
  it("hashes a file's bytes identically to hashing the same text", async () => {
    const file = new File(["hello"], "greeting.txt", { type: "text/plain" });
    const fromFile = await hashFile(file, { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    const fromText = await hashText("hello", { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(fromFile.error).toBeNull();
    expect(fromFile.output).toBe(fromText.output);
  });

  it("hashes an empty file", async () => {
    const file = new File([], "empty.txt");
    const result = await hashFile(file, { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" });
    expect(result.error).toBeNull();

    expect(result.output).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("respects the uppercase and algorithm options", async () => {
    const file = new File(["hello"], "greeting.txt");
    const result = await hashFile(file, { algorithm: "MD5", uppercase: true, outputEncoding: "hex", inputFormat: "text" });
    expect(result.output).toBe(result.output.toUpperCase());
    expect(result.output).toHaveLength(32);
  });

  // Reference digests of "hello" from Python hashlib/OpenSSL, pycryptodome (Keccak), blake3 and xxhash.
  const vectors: Array<[HashGeneratorOptions["algorithm"], string]> = [
    ["SHA-224", "ea09ae9cc6768c50fcee903ed054556e5bfc8347907f12598aa24193"],
    ["SHA-384", "59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f"],
    ["SHA3-256", "3338be694f50c5f338814986cdf0686453a888b84f424d792af4b9202398f392"],
    ["SHA3-512", "75d527c368f2efe848ecf6b073a36767800805e9eef2b1857d5f984f036eb6df891d75f72d9b154518c1cd58835286d1da9a38deba3de98b5a53e5ed78a84976"],
    ["Keccak-256", "1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8"],
    ["BLAKE2b-256", "324dcf027dd4a30a932c441f365a25e86b173defa4b8e58948253471b81b72cf"],
    ["BLAKE2b-512", "e4cfa39a3d37be31c59609e807970799caa68a19bfaa15135f165085e01d41a65ba1e1b146aeb6bd0092b49eac214c103ccfa3a365954bbbe52f74a2b3620c94"],
    ["BLAKE3", "ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f"],
    ["RIPEMD-160", "108f07b8382412612c048d07d13f814118445acd"],
    ["SM3", "becbbfaae6548b8bf0cfcad5a27183cd1be6093b1cceccc303d9c61d0a645268"],
    ["xxHash64", "26c7827d889f6da3"],
    ["CRC32", "3610a686"],
  ];
  const base: HashGeneratorOptions = { algorithm: "SHA-256", uppercase: false, outputEncoding: "hex", inputFormat: "text" };

  it.each(vectors)("computes %s", async (algorithm, expected) => {
    expect((await hashText("hello", { ...base, algorithm })).output).toBe(expected);
  });

  it("outputs Base64 and Base64URL", async () => {
    expect((await hashText("hello", { ...base, outputEncoding: "base64" })).output).toBe("LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=");
    expect((await hashText("hello", { ...base, outputEncoding: "base64url" })).output).toBe("LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ");
  });

  it("hashes hex bytes", async () => {
    expect((await hashText("68 65 6c 6c 6f", { ...base, inputFormat: "hex" })).output).toBe((await hashText("hello", base)).output);
    expect((await hashText("6", { ...base, inputFormat: "hex" })).error?.message).toBe("Hex input has an odd number of digits (1)");
  });
});

