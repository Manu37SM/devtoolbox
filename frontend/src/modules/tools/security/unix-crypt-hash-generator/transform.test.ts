import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { cryptHash, unixCryptHashGenerator as gen } from "./transform";

describe("unix crypt", () => {
  it("known vectors (glibc / Drepper spec)", () => {
    expect(cryptHash("Hello world!", { algorithm: "sha256", rounds: 5000, explicitRounds: false }, "saltstring")).toBe("$5$saltstring$5B8vYYiY.CVt1RlTTf8KbXBH3hsxY/GNooZaBBGWEc5");
    expect(cryptHash("Hello world!", { algorithm: "sha512", rounds: 5000, explicitRounds: false }, "saltstring")).toBe("$6$saltstring$svn8UoSVapNtMuq1ukKS4tPQd8iKwSMHWjl/O817G3uBnIFNjnQJuesI68u4OTLiBFdcbYEdFCoEOfaS35inz1");
  });
  it("rounds are printed only when not default (or when asked)", () => {
    expect(gen("pw", { algorithm: "sha256", salt: "ab", rounds: 1000 }).output).toMatch(/^\$5\$rounds=1000\$ab\$/);
    expect(gen("pw", { algorithm: "sha256", salt: "ab" }).output).toMatch(/^\$5\$ab\$/);
    expect(gen("pw", { algorithm: "sha256", salt: "ab", explicitRounds: true }).output).toMatch(/^\$5\$rounds=5000\$ab\$/);
  });
  it("hash then verify", () => {
    for (const algorithm of ["md5", "sha256", "sha512"] as const) {
      const h = gen("pässword", { algorithm, rounds: 1000 }).output.trim();
      expect(gen(`pässword\n${h}`, { action: "verify" }).output).toContain("✓");
      expect(gen(`wrong\n${h}`, { action: "verify" }).output).toContain("✗");
    }
  });
  it("random salts differ", () => {
    const [a, b] = gen("x\nx", {}).output.trim().split("\n");
    expect(a).not.toBe(b);
  });
  it("errors", () => {
    expect(gen("x", { salt: "bad salt" }).error).not.toBeNull();
    expect(gen("x", { algorithm: "md5", salt: "123456789" }).error).not.toBeNull();
    expect(gen("x\nnot-a-hash", { action: "verify" }).error).not.toBeNull();
    expect(gen("", {}).output).toBe("");
  });
});

// Oracle: openssl passwd (-1 md5, -5 sha256, -6 sha512)
const ossl = spawnSync("openssl", ["passwd", "-6", "-salt", "ab", "x"], { encoding: "utf8" });
const haveOpenssl = ossl.status === 0 && ossl.stdout.startsWith("$6$");
describe.skipIf(!haveOpenssl)("matches openssl passwd", { timeout: 60000 }, () => {
  const flag = { md5: "-1", sha256: "-5", sha512: "-6" } as const;
  const passwords = ["a", "pässwörd ✓", "x".repeat(16), "z".repeat(17), "0123456789abcdef".repeat(5)];
  const salts = ["a", "Zz09./abZz09./ab"];
  for (const algorithm of ["md5", "sha256", "sha512"] as const) {
    it(`${algorithm}`, () => {
      for (const pw of passwords) {
        if (pw === "") continue;
        for (const salt of salts) {
          const s = algorithm === "md5" ? salt.slice(0, 8) : salt;
          const want = spawnSync("openssl", ["passwd", flag[algorithm], "-salt", s, "-stdin"], { input: pw, encoding: "utf8" }).stdout.trim();
          expect(cryptHash(pw, { algorithm, rounds: 5000, explicitRounds: false }, s), `${algorithm} ${JSON.stringify(pw)} ${s}`).toBe(want);
        }
      }
    });
  }
});
