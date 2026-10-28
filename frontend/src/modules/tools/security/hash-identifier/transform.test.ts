import { describe, expect, it } from "vitest";
import { identifyHash, identifyHashes } from "./transform";

const names = (s: string) => identifyHash(s).map((g) => g.name);

describe("identifyHash", () => {
  it("identifies hex digests by length", () => {
    expect(names("d41d8cd98f00b204e9800998ecf8427e")[0]).toBe("MD5");
    expect(names("da39a3ee5e6b4b0d3255bfef95601890afd80709")[0]).toBe("SHA-1");
    expect(names("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")[0]).toBe("SHA-256");
    expect(names("cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e")[0]).toBe("SHA-512");
  });
  it("identifies prefixed password hashes", () => {
    expect(names("$2b$12$KIXQ5yQn1oKq5jH1x5u0xOeDq3k2m1v4n6bq8w9r7t5y3u1i0o2pa".slice(0, 60))[0]).toBe("bcrypt");
    expect(names("$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG")[0]).toBe("Argon2");
    expect(names("$6$saltsalt$abc")[0]).toBe("SHA-512-crypt ($6$)");
    expect(names("*2470C0C06DEE42FD1618BB99005ADCA2EC9D1E19")[0]).toContain("MySQL");
    expect(names("{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=")[0]).toContain("SHA-1");
  });
  it("handles base64 digests, tagged hashes and junk", () => {
    expect(names("2jmj7l5rSw0yVb/vlWAYkK/YBwk=")[0]).toBe("SHA-1 (base64)");
    expect(names("sha256:" + "a".repeat(64))[0]).toBe("SHA-256");
    expect(identifyHash("hello world")).toEqual([]);
    expect(names("abcd")[0]).toContain("Hex string");
  });
});

describe("identifyHashes", () => {
  it("formats several lines and flags unknown ones", () => {
    const r = identifyHashes("d41d8cd98f00b204e9800998ecf8427e\n???", { showNotes: true });
    expect(r.output).toContain("1. MD5 [high]");
    expect(r.error?.message).toContain("1 line");
    const quiet = identifyHashes("d41d8cd98f00b204e9800998ecf8427e", { showNotes: false });
    expect(quiet.output).not.toContain("Broken");
  });
});
