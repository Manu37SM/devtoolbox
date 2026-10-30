import { describe, expect, it } from "vitest";
import { derToPem, generateKeyPairPem, jwkThumbprint, jwkToOpenSshBlob } from "./transform";

describe("derToPem", () => {
  it("wraps bytes in PEM armor with 64-char line wrapping", () => {
    const bytes = new Uint8Array(100).fill(65);
    const pem = derToPem(bytes.buffer, "PUBLIC KEY");
    expect(pem.startsWith("-----BEGIN PUBLIC KEY-----\n")).toBe(true);
    expect(pem.endsWith("-----END PUBLIC KEY-----")).toBe(true);
    const bodyLines = pem.split("\n").slice(1, -1);
    for (const line of bodyLines.slice(0, -1)) {
      expect(line.length).toBe(64);
    }
  });
});

describe("generateKeyPairPem — RSA", () => {
  it("generates a valid PEM-armored RSA key pair", async () => {
    const result = await generateKeyPairPem({ keyType: "rsa", rsaModulusLength: 2048, ecCurve: "P-256" });
    expect(result.error).toBeNull();
    expect(result.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(result.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
  }, 15000);
});

describe("generateKeyPairPem — EC", () => {
  it("generates a valid PEM-armored EC key pair for each supported curve", async () => {
    for (const ecCurve of ["P-256", "P-384", "P-521"] as const) {
      const result = await generateKeyPairPem({ keyType: "ec", rsaModulusLength: 2048, ecCurve });
      expect(result.error).toBeNull();
      expect(result.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
      expect(result.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
    }
  }, 15000);
});

// Output of each format was cross-checked with Python's `cryptography` (load_pem_private_key,
// load_ssh_public_key, JWK import) and RFC 7638 thumbprints computed independently.
describe("key formats", () => {
  it("writes PKCS#1 / SEC1 'traditional' PEM", async () => {
    const rsa = await generateKeyPairPem({ keyType: "rsa", format: "traditional" });
    expect(rsa.privateKeyPem.startsWith("-----BEGIN RSA PRIVATE KEY-----")).toBe(true);
    expect(rsa.publicKeyPem.startsWith("-----BEGIN RSA PUBLIC KEY-----")).toBe(true);
    const ec = await generateKeyPairPem({ keyType: "ec", format: "traditional" });
    expect(ec.privateKeyPem.startsWith("-----BEGIN EC PRIVATE KEY-----")).toBe(true);
    expect(ec.privateKeyPem).not.toContain("EC PARAMETERS");
  }, 20000);

  it("writes JWKs with kid, use and alg, and keeps the private part out of the public JWK", async () => {
    const r = await generateKeyPairPem({ keyType: "ec", ecCurve: "P-384", format: "jwk" });
    const pub = JSON.parse(r.publicKeyPem);
    expect(pub).toMatchObject({ kty: "EC", crv: "P-384", use: "sig", alg: "ES384", kid: r.kid });
    expect(pub.d).toBeUndefined();
    expect(JSON.parse(r.privateKeyPem).d).toBeTruthy();
    const enc = await generateKeyPairPem({ keyType: "rsa", format: "jwk", use: "enc" });
    expect(JSON.parse(enc.publicKeyPem)).toMatchObject({ use: "enc", alg: "RSA-OAEP-256" });
  }, 20000);

  it("writes OpenSSH public keys with a comment and SHA256 fingerprint", async () => {
    const r = await generateKeyPairPem({ keyType: "ed25519", format: "openssh", comment: "me@laptop" });
    expect(r.publicKeyPem).toMatch(/^ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI[A-Za-z0-9+/]+ me@laptop$/);
    expect(r.fingerprint).toMatch(/^SHA256:[A-Za-z0-9+/]{43}$/);
    const ec = await generateKeyPairPem({ keyType: "ec", format: "openssh" });
    expect(ec.publicKeyPem.startsWith("ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTY")).toBe(true);
  });

  it("matches the RFC 7638 thumbprint example and rejects Ed25519 for encryption", async () => {
    const rfc = {
      kty: "RSA",
      n: "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
      e: "AQAB",
      alg: "RS256",
      kid: "2011-04-29",
    };
    expect(await jwkThumbprint(rfc)).toBe("NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs");
    expect(jwkToOpenSshBlob(rfc).type).toBe("ssh-rsa");
    expect((await generateKeyPairPem({ keyType: "ed25519", use: "enc" })).error).toContain("signatures only");
  });
});

