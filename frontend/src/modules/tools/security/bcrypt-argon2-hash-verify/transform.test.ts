import { describe, expect, it } from "vitest";
import { hashOrVerify } from "./transform";
import type { BcryptArgon2Options } from "./schema";

const base: BcryptArgon2Options = {
  algorithm: "bcrypt",
  mode: "hash",
  password: "hunter2",
  existingHash: "",
  bcryptCost: 4,
  argon2Iterations: 1,
  argon2MemoryKib: 8,
  argon2Parallelism: 1,
};

describe("hashOrVerify — bcrypt", () => {
  it("hashes a password into a $2 bcrypt-format string", async () => {
    const result = await hashOrVerify(base);
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^\$2[aby]?\$\d{2}\$/);
  }, 15000);

  it("round-trips through hash then verify", async () => {
    const hashed = await hashOrVerify(base);
    const verified = await hashOrVerify({
      ...base,
      mode: "verify",
      existingHash: hashed.output,
    });
    expect(verified.error).toBeNull();
    expect(verified.verified).toBe(true);
  }, 15000);

  it("verify fails for the wrong password", async () => {
    const hashed = await hashOrVerify(base);
    const verified = await hashOrVerify({
      ...base,
      mode: "verify",
      password: "wrong-password",
      existingHash: hashed.output,
    });
    expect(verified.verified).toBe(false);
  }, 15000);
});

describe("hashOrVerify — argon2id", () => {
  it("hashes a password into an $argon2id-format string", async () => {
    const result = await hashOrVerify({ ...base, algorithm: "argon2id" });
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^\$argon2id\$/);
  }, 15000);

  it("round-trips through hash then verify", async () => {
    const hashed = await hashOrVerify({ ...base, algorithm: "argon2id" });
    const verified = await hashOrVerify({
      ...base,
      algorithm: "argon2id",
      mode: "verify",
      existingHash: hashed.output,
    });
    expect(verified.verified).toBe(true);
  }, 15000);
});

describe("hashOrVerify — validation", () => {
  it("errors in verify mode with no existing hash provided", async () => {
    const result = await hashOrVerify({ ...base, mode: "verify", existingHash: "" });
    expect(result.error).not.toBeNull();
  });
});
