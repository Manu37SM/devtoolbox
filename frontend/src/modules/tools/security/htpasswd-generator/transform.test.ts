import { describe, expect, it } from "vitest";
import { apr1, generateHtpasswd, md5, sha1, sha1Entry } from "./transform";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const enc = (s: string) => new TextEncoder().encode(s);

describe("primitives", () => {
  it("md5 and sha1 known vectors", () => {
    expect(hex(md5(enc("abc")))).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(hex(sha1(enc("abc")))).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
    expect(hex(sha1(enc("")))).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });
});

describe("hash formats (reference values from passlib / hashlib)", () => {
  it("apr1", () => {
    expect(apr1("password", "abcdefgh")).toBe("$apr1$abcdefgh$FBwExRW4dCc8aL.OvjpIE1");
    expect(apr1("myPassword", "r31.....")).toBe("$apr1$r31.....$HqJZimcKQFAMYayBlzkrA/");
    expect(apr1("", "12345678")).toBe("$apr1$12345678$sHuPAw7VA9xjRbJz7zKV7/");
  });
  it("sha1", () => {
    expect(sha1Entry("password")).toBe("{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=");
  });
});

describe("generateHtpasswd", () => {
  const o = { algorithm: "apr1" as const };
  it("writes user:hash lines with an injectable salt", () => {
    expect(generateHtpasswd("alice:password", o, 0, () => "abcdefgh").output).toBe("alice:$apr1$abcdefgh$FBwExRW4dCc8aL.OvjpIE1\n");
    expect(generateHtpasswd("bob:password", { algorithm: "sha1" }).output).toBe("bob:{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=\n");
  });
  it("uses random salts by default", () => {
    const a = generateHtpasswd("u:pw", o).output, b = generateHtpasswd("u:pw", o).output;
    expect(a).toMatch(/^u:\$apr1\$[./0-9A-Za-z]{8}\$[./0-9A-Za-z]{22}\n$/);
    expect(a).not.toBe(b);
  });
  it("keeps colons in passwords and handles unicode", () => {
    expect(generateHtpasswd("u:a:b", o, 0, () => "abcdefgh").output).toBe(`u:${apr1("a:b", "abcdefgh")}\n`);
    expect(generateHtpasswd("u:pässwörd", o, 0, () => "abcdefgh").output).toContain("$apr1$abcdefgh$");
  });
  it("validates lines", () => {
    expect(generateHtpasswd("nocolon", o).error?.line).toBe(1);
    expect(generateHtpasswd("a:b\na:c", o).error?.message).toMatch(/Duplicate/);
    expect(generateHtpasswd("u:", o).error?.message).toMatch(/empty/);
    expect(generateHtpasswd("a b:c", o).error?.message).toMatch(/spaces/);
    expect(generateHtpasswd("", o)).toEqual({ output: "", error: null });
  });
});
