import { describe, expect, it } from "vitest";
import { decodeJwt } from "./transform";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

describe("decodeJwt", () => {
  it("decodes header and payload", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.error).toBeNull();
    expect(result.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(result.payload).toEqual({ sub: "1234567890", name: "John Doe", iat: 1516239022 });
  });

  it("returns the raw signature segment", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.signature).toBe("SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c");
  });

  it("computes issuedAt from iat", () => {
    const result = decodeJwt(SAMPLE_JWT);
    expect(result.issuedAt).toBe(new Date(1516239022 * 1000).toISOString());
  });

  it("flags an expired token", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ exp: 1 })).toString("base64url");
    const result = decodeJwt(`${header}.${payload}.sig`);
    expect(result.isExpired).toBe(true);
  });

  it("returns empty result for empty input without error", () => {
    expect(decodeJwt("   ")).toEqual({
      header: null,
      payload: null,
      signature: null,
      isExpired: null,
      expiresAt: null,
      issuedAt: null,
      error: null,
    });
  });

  it("errors on malformed token structure", () => {
    const result = decodeJwt("not.a.valid.jwt.token");
    expect(result.error).toBeTruthy();
  });

  it("errors on unparsable header", () => {
    const result = decodeJwt("!!!.eyJhIjoxfQ.sig");
    expect(result.error).toBeTruthy();
  });
});

// Tokens signed with PyJWT 2 (independent of jsrsasign); claims iat/nbf 1790000000, exp +1h.
const FIX = {
  "hs": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImlzcyI6Imh0dHBzOi8vaWRwLmV4YW1wbGUiLCJhdWQiOiJhcGk6Ly9vcmRlcnMiLCJpYXQiOjE3OTAwMDAwMDAsIm5iZiI6MTc5MDAwMDAwMCwiZXhwIjoxNzkwMDAzNjAwfQ.3tQTxpOReQISGAIzpc-aD_dFKzmJT_a7dPtWhHGgRJ0",
  "rs": "eyJhbGciOiJSUzI1NiIsImtpZCI6InJzYTEiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiI0MiIsImlzcyI6Imh0dHBzOi8vaWRwLmV4YW1wbGUiLCJhdWQiOiJhcGk6Ly9vcmRlcnMiLCJpYXQiOjE3OTAwMDAwMDAsIm5iZiI6MTc5MDAwMDAwMCwiZXhwIjoxNzkwMDAzNjAwfQ.WnsCMibCh6blooEfHSqtARuhUjhhK3kBpIbmQ8dJMDLq-pNlexVXN7V5Pr9qzM882ygQDiiaKSfuT2Gs3z22hce-WsFUIy7T4YT2u8wfetC1_YJ3MTJ8VQoZPYGdPGCG5lSjy-CeWE1ZpAK14OIIe2rWWmg_34CHRjNbaKk_nP6NsiiND84ecTnqO2Ts5Ns_oq-Z2y3uIiGY5ssfiTd56fasmfnTtMtST0KxLzyRLbAYic2JoDGcRxEHTr3YBSqcsqzwCVzxhB0yyDu-DTqW0dZzkmxl8YHN6UQ_o28xOs-DrV3Gqsh0ZAtHefH7MmBY1dyWRgwH4B8iYzs05iHobg",
  "ps": "eyJhbGciOiJQUzI1NiIsImtpZCI6InJzYTEiLCJ0eXAiOiJKV1QifQ.eyJzdWIiOiI0MiIsImlzcyI6Imh0dHBzOi8vaWRwLmV4YW1wbGUiLCJhdWQiOiJhcGk6Ly9vcmRlcnMiLCJpYXQiOjE3OTAwMDAwMDAsIm5iZiI6MTc5MDAwMDAwMCwiZXhwIjoxNzkwMDAzNjAwfQ.XrCfzCwhE3Yo9xMxQFLjlGZMu9vS-HW462FGtZmrMuRcSEZtXBwjv6EWBQI3U5KXzxtEydXTsjhepClvrvQ-G2_Cimf4j_fKaxid8i6i2mVA5qpctriBbSjyg4ODSA6NQmbgDg3K7TDmRmVBiCk9Gdnm0fwyjIEgN22oH-EzTBvFJFFmYnTJOA0vzvgyZrWoGr4wvva5dpD2Zb_erUWJN9XqDllejoYMHj78eEkwsAZ1rrPb14-8ASyIcIU5h6bQuSDJGeezSAFLB1oE2hO1FnXiQsHSMQBKbVbFDm7NcKc5qvgXZXiOIPYufnza8sIVHgrBf7JqXY-C7YdeJMIQjA",
  "es": "eyJhbGciOiJFUzI1NiIsImtpZCI6ImVjMSIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImlzcyI6Imh0dHBzOi8vaWRwLmV4YW1wbGUiLCJhdWQiOiJhcGk6Ly9vcmRlcnMiLCJpYXQiOjE3OTAwMDAwMDAsIm5iZiI6MTc5MDAwMDAwMCwiZXhwIjoxNzkwMDAzNjAwfQ.3IV1MkOOaMJADPXJCIjRHH4x69jDUyendYkfvDZ8bUGT-tU5roYT7UQEe82dZg4yh_tSuGAadnnLpn9d_l3XWg",
  "rsapem": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkJ9NbKreFGCO+grLfPNZ\nL7+Pbc0apU1TLDZBYS/chAQ4YQZ/hGNlxqe9wRO87HtxWjucxPhNqFx/LV4hgDAU\nPKwa7pgIaCyIKTkaQZlyWlHn5RXsY6kF68Py0iLYFdUNojH1I7zr/DmXy8DDAvOO\nIb9PLDnIYHkxvJM/c7KcU5G2j51sri3j5CcrfhcGxAkFreTXxXLNYXkY0lzLsp2K\ng+Ih/nd4KoWjmEfNAl1CYlt/3JCvbE+H2OYy07I8AHyX31IXR4tElcx+AsvVa1KB\nInx80Af+jWeoeqj6P0QiaTHOy1LLKDih8WgX00OgEKhsCeGGJPYoAAT4q9D4wXMf\nbwIDAQAB\n-----END PUBLIC KEY-----\n",
  "ecpem": "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEAwy7DirNMJ4n0paW3+vsKiWYgAFC\nViaP5NVZAU90IM3kkKdw0V96cA60uFphZbTP8A7SIRs0PGh8zvv8djz01w==\n-----END PUBLIC KEY-----\n",
  "jwks": "{\"keys\": [{\"kty\": \"EC\", \"crv\": \"P-256\", \"x\": \"Awy7DirNMJ4n0paW3-vsKiWYgAFCViaP5NVZAU90IM0\", \"y\": \"5JCncNFfenAOtLhaYWW0z_AO0iEbNDxofM77_HY89Nc\", \"kid\": \"ec1\"}, {\"kty\": \"RSA\", \"key_ops\": [\"verify\"], \"n\": \"kJ9NbKreFGCO-grLfPNZL7-Pbc0apU1TLDZBYS_chAQ4YQZ_hGNlxqe9wRO87HtxWjucxPhNqFx_LV4hgDAUPKwa7pgIaCyIKTkaQZlyWlHn5RXsY6kF68Py0iLYFdUNojH1I7zr_DmXy8DDAvOOIb9PLDnIYHkxvJM_c7KcU5G2j51sri3j5CcrfhcGxAkFreTXxXLNYXkY0lzLsp2Kg-Ih_nd4KoWjmEfNAl1CYlt_3JCvbE-H2OYy07I8AHyX31IXR4tElcx-AsvVa1KBInx80Af-jWeoeqj6P0QiaTHOy1LLKDih8WgX00OgEKhsCeGGJPYoAAT4q9D4wXMfbw\", \"e\": \"AQAB\", \"kid\": \"rsa1\"}]}",
  "hsb64": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImlzcyI6Imh0dHBzOi8vaWRwLmV4YW1wbGUiLCJhdWQiOiJhcGk6Ly9vcmRlcnMiLCJpYXQiOjE3OTAwMDAwMDAsIm5iZiI6MTc5MDAwMDAwMCwiZXhwIjoxNzkwMDAzNjAwfQ.jjU9ESpAZvafUxJhurvDHyYiz6AtzVv84O3c6FX_Zj0"
};
const AT = 1_790_000_100_000; // 100 s after issue

describe("decodeJwt — verification and claim checks", () => {
  it("verifies HMAC secrets in each encoding", () => {
    expect(decodeJwt(FIX.hs, { verifySecret: "s3cret-key-that-is-long-enough!!" }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.hs, { verifySecret: "wrong" }, AT).verification?.status).toBe("invalid");
    const hex = "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    expect(decodeJwt(FIX.hsb64, { verifySecret: hex, secretEncoding: "hex" }, AT).verification?.status).toBe("valid");
    const b64 = Buffer.from(hex, "hex").toString("base64");
    expect(decodeJwt(FIX.hsb64, { verifySecret: b64, secretEncoding: "base64" }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.hs, {}, AT).verification).toBeUndefined();
  });

  it("verifies RS256, PS256 and ES256 with PEM keys and a JWKS", () => {
    expect(decodeJwt(FIX.rs, { publicKey: FIX.rsapem }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.ps, { publicKey: FIX.rsapem }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.es, { publicKey: FIX.ecpem }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.es, { publicKey: FIX.jwks }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.rs, { publicKey: FIX.jwks }, AT).verification?.status).toBe("valid");
    expect(decodeJwt(FIX.rs, { publicKey: FIX.ecpem }, AT).verification?.status).not.toBe("valid");
  });

  it("refuses algorithm confusion: an HS256 token 'signed' with the public key text", () => {
    // A secret-based token doesn't use the public key field at all.
    expect(decodeJwt(FIX.hs, { publicKey: FIX.rsapem }, AT).verification).toBeUndefined();
  });

  it("checks exp, nbf, issuer and audience with leeway", () => {
    const ok = decodeJwt(FIX.rs, { expectedIssuer: "https://idp.example", expectedAudience: "api://orders" }, AT).checks!;
    expect(ok.filter((c) => c.status === "fail")).toEqual([]);
    expect(ok.find((c) => c.label === "Lifetime")?.detail).toBe("1h");
    const late = decodeJwt(FIX.rs, {}, 1_790_003_700_000).checks!;
    expect(late.find((c) => c.label === "Expiry (exp)")).toMatchObject({ status: "fail" });
    expect(decodeJwt(FIX.rs, { leewaySeconds: 120 }, 1_790_003_700_000).checks!.find((c) => c.label === "Expiry (exp)")?.status).toBe("pass");
    expect(decodeJwt(FIX.rs, {}, 1_789_999_000_000).checks!.find((c) => c.label === "Not before (nbf)")?.status).toBe("fail");
    const bad = decodeJwt(FIX.rs, { expectedIssuer: "x", expectedAudience: "y" }, AT).checks!;
    expect(bad.filter((c) => c.status === "fail").map((c) => c.label)).toEqual(["Issuer (iss)", "Audience (aud)"]);
  });

  it("accepts a Bearer header and recognises JWE and alg none", () => {
    expect(decodeJwt(`Authorization: Bearer ${FIX.rs}`, {}, AT).payload?.sub).toBe("42");
    const jwe = "eyJhbGciOiJSU0EtT0FFUCIsImVuYyI6IkEyNTZHQ00ifQ.a.b.c.d";
    expect(decodeJwt(jwe)).toMatchObject({ encrypted: true, header: { alg: "RSA-OAEP", enc: "A256GCM" } });
    const none = "eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.";
    expect(decodeJwt(none).checks![0]).toMatchObject({ status: "fail" });
  });
});

