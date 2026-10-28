import { describe, expect, it } from "vitest";
import { analyzeKey, bitLength, fingerprintKeys, md5, sha256 } from "./transform";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const enc = (s: string) => new TextEncoder().encode(s);

function sshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length);
  out.set(bytes, 4);
  return out;
}
const concat = (...parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]));
const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));

describe("hash primitives", () => {
  it("sha256 matches known vectors", () => {
    expect(hex(sha256(enc("")))).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(hex(sha256(enc("abc")))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hex(sha256(enc("a".repeat(1000))))).toBe("41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3");
  });
  it("md5 matches known vectors", () => {
    expect(hex(md5(enc("")))).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(hex(md5(enc("abc")))).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(hex(md5(enc("The quick brown fox jumps over the lazy dog")))).toBe("9e107d9d372bb6826bd81d3542a419d6");
  });
  it("bitLength of mpints", () => {
    expect(bitLength(Uint8Array.from([0, 0x80]))).toBe(8);
    expect(bitLength(Uint8Array.from([0, 0xff, 0xff]))).toBe(16);
    expect(bitLength(Uint8Array.from([1, 0]))).toBe(9);
  });
});

describe("analyzeKey", () => {
  const edBlob = concat(sshString(enc("ssh-ed25519")), sshString(new Uint8Array(32).fill(7)));
  const rsaN = new Uint8Array(257).fill(0xab); rsaN[0] = 0;
  const rsaBlob = concat(sshString(enc("ssh-rsa")), sshString(Uint8Array.from([1, 0, 1])), sshString(rsaN));
  it("fingerprints an ed25519 key and agrees with WebCrypto", async () => {
    const k = analyzeKey(`ssh-ed25519 ${b64(edBlob)} me@host`);
    expect(k.bits).toBe(256);
    expect(k.label).toBe("ED25519");
    expect(k.comment).toBe("me@host");
    const ref = new Uint8Array(await crypto.subtle.digest("SHA-256", edBlob));
    expect(k.sha256).toBe("SHA256:" + b64(ref).replace(/=+$/, ""));
    expect(k.md5).toMatch(/^MD5:([0-9a-f]{2}:){15}[0-9a-f]{2}$/);
  });
  it("reads the RSA modulus size", () => {
    expect(analyzeKey(`ssh-rsa ${b64(rsaBlob)}`).bits).toBe(2048);
  });
  it("rejects mismatched, truncated and non-key input", () => {
    expect(() => analyzeKey(`ssh-rsa ${b64(edBlob)}`)).toThrow(/does not match/);
    expect(() => analyzeKey(`ssh-ed25519 ${b64(edBlob.slice(0, 10))}`)).toThrow(/truncated/);
    expect(() => analyzeKey("hello world")).toThrow(/Expected an OpenSSH/);
  });
});

describe("fingerprintKeys", () => {
  it("prints ssh-keygen style output and flags problems per line", () => {
    const edBlob = concat(sshString(enc("ssh-ed25519")), sshString(new Uint8Array(32)));
    const r = fingerprintKeys(`ssh-ed25519 ${b64(edBlob)} laptop\ngarbage`, { format: "sha256" });
    expect(r.output).toMatch(/^256 ED25519  laptop\n  SHA256:/);
    expect(r.output).not.toContain("MD5:");
    expect(r.error?.message).toContain("Line 2");
    expect(fingerprintKeys("-----BEGIN OPENSSH PRIVATE KEY-----", { format: "both" }).error?.message).toContain("PEM");
  });
});
