import { describe, expect, it } from "vitest";
import { base64ToBytes } from "@/lib/byte-input";
import { FIXTURES } from "./fixtures.test-data";
import { jwkToSpki, runJwksInspector, spkiToJwk, thumbprint, toPem } from "./transform";

const strip = (x: Record<string, string>) => { const { _thumb, _pem, ...jwk } = x; return { jwk, thumb: _thumb ?? "", pem: _pem ?? "" }; };
const pemBody = (pem: string) => base64ToBytes(pem.replace(/-----[^-]+-----/g, ""));

describe("RFC 7638 thumbprints (match Python hashlib)", () => {
  for (const name of ["rsa", "ec", "ed"] as const) {
    it(name, async () => {
      const { jwk, thumb } = strip(FIXTURES[name] as unknown as Record<string, string>);
      expect(await thumbprint(jwk)).toBe(thumb);
    });
  }
});

describe("JWK <-> SPKI (match OpenSSL)", () => {
  for (const name of ["rsa", "ec", "ed"] as const) {
    it(name, () => {
      const { jwk, pem } = strip(FIXTURES[name] as unknown as Record<string, string>);
      expect([...jwkToSpki(jwk)]).toEqual([...pemBody(pem)]);
      expect(spkiToJwk(pemBody(pem))).toEqual(jwk);
      expect(toPem(jwkToSpki(jwk))).toBe(pem.trim());
    });
  }
});

describe("runJwksInspector", () => {
  const rsa = strip(FIXTURES.rsa as unknown as Record<string, string>);
  const ec = strip(FIXTURES.ec as unknown as Record<string, string>);
  it("summarises keys and flags problems", async () => {
    const jwks = { keys: [{ ...rsa.jwk, kid: "k1", use: "sig", alg: "RS256" }, { ...ec.jwk, kid: "k1", alg: "ES384", d: "secret" }, { kty: "oct", k: "c2VjcmV0" }] };
    const out = (await runJwksInspector(JSON.stringify(jwks), { output: "summary" })).output;
    expect(out).toContain("kty: RSA, 2048 bits");
    expect(out).toContain(`RFC 7638 thumbprint (SHA-256): ${rsa.thumb}`);
    expect(out).toContain("alg ES384 needs curve P-384, not P-256.");
    expect(out).toContain("Contains private key members (d)");
    expect(out).toContain("Contains a symmetric secret (k)");
    expect(out).toContain("Duplicate kid values: k1");
    expect(out).toContain("No kid");
  });
  it("converts PEM to a JWKS with a thumbprint kid", async () => {
    const out = (await runJwksInspector(ec.pem, { output: "summary" })).output;
    const parsed = JSON.parse(out.split("\n\n")[0]!);
    expect(parsed.keys[0]).toEqual({ ...ec.jwk, kid: ec.thumb, use: "sig", alg: "ES256" });
  });
  it("exports PEM and strips private members for publishing", async () => {
    expect((await runJwksInspector(JSON.stringify({ keys: [{ ...rsa.jwk, kid: "a" }] }), { output: "pem" })).output).toBe(`# kid: a\n${rsa.pem.trim()}`);
    const pub = JSON.parse((await runJwksInspector(JSON.stringify({ ...ec.jwk, d: "x" }), { output: "jwks" })).output);
    expect(pub.keys[0].d).toBeUndefined();
    expect(pub.keys[0].kid).toBe(ec.thumb);
  });
  it("refuses private PEM keys and bad JSON", async () => {
    expect((await runJwksInspector("-----BEGIN PRIVATE KEY-----\nAA\n-----END PRIVATE KEY-----", { output: "summary" })).error?.message).toContain("PRIVATE key");
    expect((await runJwksInspector("{}", { output: "summary" })).error?.message).toContain("Expected a JWKS");
  });
});
