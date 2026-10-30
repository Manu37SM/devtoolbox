import { describe, expect, it } from "vitest";
import { decodeCsr, decodeCsrInfo } from "./transform";

const RSA2048 = `-----BEGIN CERTIFICATE REQUEST-----
MIIC5TCCAc0CAQAwUDELMAkGA1UEBhMCSU4xFDASBgNVBAgMC01haGFyYXNodHJh
MRUwEwYDVQQKDAxBY21lIFB2dCBMdGQxFDASBgNVBAMMC2V4YW1wbGUuY29tMIIB
IjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA354oz54jy23wJp5PrxihGK/6
nAhdPKWzrpA6YNR/cVKB8QLhHlZdfnTqXSWG2IR3ncfMW7TNa7BkEQGOrBeV/XeX
+3u/Cvw9aXBM6R8PjrSuPepA8jnZDrsw5CCIdqD0fzqa6ixTux17NlYSDYOh8DdO
+8Os7z/U+LAp/GsIXjQ3zE84P/YYoGYukFaR4564iBZ9KZIwh/lHdW15CmqjHV7/
WcJNvHJaGBvjZ8sIkV3tBuJfQbmjC+pPiXbNkEHIROhYKd22CLOajDgVCc8cpbgD
Q/nxjR3pbPfBAwaQeQCTjEA7ScvMUcoSU/Tl3ZubnEpceurT8Sm5pEmBYc3UFwID
AQABoFAwTgYJKoZIhvcNAQkOMUEwPzAtBgNVHREEJjAkggtleGFtcGxlLmNvbYIP
d3d3LmV4YW1wbGUuY29thwQKAQIDMA4GA1UdDwEB/wQEAwIFoDANBgkqhkiG9w0B
AQsFAAOCAQEAAHcMRCKoJWzHJOVIH3wnEUSjC7MekSvC3wzavO9nfWt7n3peTS6a
2gm/0i2C6+ojSVcoRyqdqvqT4M0nNyI8uTuQhNWoieWChyathcKJAqjXNyr61rRU
f1gydrOrbLCeVQIHBMhEquwcvHSDwhYzPSdEuX+gYNPo3G3iqZf3Oy+EKrnllkdG
4VZwoUX4IauU712ZzeHPILTxhCzdkNRCNZPLOQmKFWTEzzd1Rjc177AAswXKwI5I
PAgg/ahVIXH2IBMUvccizb3h2ceT8tx3i2Ln6gaKtIMW7PcTf7GCar8NMLvLa1vH
dbjErzZR62cHg816QZzl3lCVmUilzjUjug==
-----END CERTIFICATE REQUEST-----`;
const EC256 = `-----BEGIN CERTIFICATE REQUEST-----
MIIBRzCB7wIBADBQMQswCQYDVQQGEwJJTjEUMBIGA1UECAwLTWFoYXJhc2h0cmEx
FTATBgNVBAoMDEFjbWUgUHZ0IEx0ZDEUMBIGA1UEAwwLZXhhbXBsZS5jb20wWTAT
BgcqhkjOPQIBBggqhkjOPQMBBwNCAAQIhbsRRQmMrCaqsZnWiE2UDtLpbzzmG8gl
KmVwqT9gZUEfguMjTa5R2Qm4O7HZBfDxxWP+RRautCckjexeawvqoD0wOwYJKoZI
hvcNAQkOMS4wLDAaBgNVHREEEzARgg9hcGkuZXhhbXBsZS5jb20wDgYDVR0PAQH/
BAQDAgWgMAoGCCqGSM49BAMDA0cAMEQCICiLAHgSlabL6S6Kj7JbadApHfjoaxhI
XF4bFRhSH9ThAiAGjONpJPfIQr7Msm+Ak2mRSzME6UMeZdJKiPT8KGqlLA==
-----END CERTIFICATE REQUEST-----`;
const RSA1024_SHA1 = `-----BEGIN CERTIFICATE REQUEST-----
MIIBezCB5QIBADA8MQswCQYDVQQGEwJVUzETMBEGA1UECgwKTGVnYWN5IEluYzEY
MBYGA1UEAwwPb2xkLmV4YW1wbGUuY29tMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCB
iQKBgQCqZe5M3I6VJuJuh5La2fuXOMb8ovbcEJaIxXGoz+Z+6jGz1JxtbIADURqD
TpiteNgfgm2uPrDpCdy5gNhTMxaVgho4drYPioe53erMfa9Q54BjudAHeENgAa9L
1XxeWL3NWeSsEkBHKi8/h9Ht9MJFPDh7xJrsVhQAuj1tZBOiIwIDAQABoAAwDQYJ
KoZIhvcNAQEFBQADgYEAAv1I4Y+9x+kWk8Jz9nBC9QldZgtFA77To3dMXSJ0mHf6
uT8auHHAFl9Jia0dcrPpS8oGWBntWVbbObjK6wki9CEJISzXX5FBK5el9UUPNm2j
46trxfEeY+TgGi66cxaDqNXJfEXc4rovBdZEhook/6ExBRBzlJSOwOfPcGTsyL4=
-----END CERTIFICATE REQUEST-----`;
const ED25519 = `-----BEGIN CERTIFICATE REQUEST-----
MIHWMIGJAgEAMBkxFzAVBgNVBAMMDmVkLmV4YW1wbGUuY29tMCowBQYDK2VwAyEA
/EMcBk19s+rAoIqKKTWQryktFCwmZ+f8wmzlSnnyHTCgPTA7BgkqhkiG9w0BCQ4x
LjAsMCoGA1UdEQQjMCGCDmVkLmV4YW1wbGUuY29tgQ9vcHNAZXhhbXBsZS5jb20w
BQYDK2VwA0EAHdcbH7rxyjWvqIW7iFOKyZ2m7H9DfKU+xFkdSt+kXghDlA5PR0zy
ZKKsqtux+pXYcsKzZKDiZJVjM5b3gVbDCg==
-----END CERTIFICATE REQUEST-----`;

import type { CsrDecoderOptions } from "./schema";

const opts: CsrDecoderOptions = { dnStyle: "openssl", output: "summary", expectNames: "", fingerprintStyle: "hex" };
const info = (p: string, o: Partial<CsrDecoderOptions> = {}) => decodeCsrInfo(p, { ...opts, ...o });

describe("decodeCsr", () => {
  it("decodes an RSA-2048 request (values from openssl)", () => {
    const i = info(RSA2048);
    expect(i.commonName).toBe("example.com");
    expect(i.subject).toContain("CN=example.com");
    expect(i.subjectAltNames).toEqual(["DNS:example.com", "DNS:www.example.com", "IP:10.1.2.3"]);
    expect(i.keySize).toBe(2048);
    expect(i.signatureValid).toBe(true);
    expect(i.sha256Fingerprint).toBe("563533e84dd40fa1c50626291bc0d460ed50a254cc420d822def41df3472f992");
    expect(i.publicKeySha256).toBe("7679131dae4fa0634b41d33edad5e16637a4897c7599a72752803ceceef71939");
    expect(i.modulusSha256).toBe("20e123128838f7ca23912014633ffc6b39af3e9a96f1290563703f8a6d539330");
  });
  it("flags private IPs in the SAN", () => {
    expect(info(RSA2048).warnings.join("\n")).toMatch(/10\.1\.2\.3.*private/);
  });
  it("decodes an EC P-256 request", () => {
    const i = info(EC256);
    expect(i.publicKeyAlgorithm).toMatch(/EC/);
    expect(i.keySize).toBe(256);
    expect(i.subjectAltNames).toEqual(["DNS:api.example.com"]);
    expect(i.signatureValid).toBe(true);
    expect(i.sha256Fingerprint).toBe("40160e26b4bfc85ef1db97c3bcd75f8e042fa5fae1b44580dc877f9a357f575d");
    expect(i.publicKeySha256).toBe("7538e90add819cd0127c6579080bf689dfe327253f17032682d0db070dc4a488");
    expect(i.modulusSha256).toBeNull();
  });
  it("warns about weak key, SHA-1 and missing SAN", () => {
    const w = info(RSA1024_SHA1).warnings.join("\n");
    expect(w).toMatch(/1024-bit RSA/);
    expect(w).toMatch(/SHA1/i);
    expect(w).toMatch(/No Subject Alternative Name/);
  });
  it("reports expected names that are not covered", () => {
    const w = info(RSA2048, { expectNames: "example.com, shop.example.com" }).warnings.join("\n");
    expect(w).toContain('"shop.example.com"');
    expect(w).not.toContain('"example.com" is not');
  });
  it("accepts rfc2253 DN style", () => {
    expect(info(RSA2048, { dnStyle: "rfc2253" }).subject).toBe("CN=example.com,O=Acme Pvt Ltd,ST=Maharashtra,C=IN");
  });
  it("accepts a bare base64 body and the NEW header", () => {
    const body = RSA2048.replace(/-----[^-]+-----/g, "");
    expect(decodeCsr(body, { fingerprintStyle: "hex" }).output).toContain("563533e8");
    const legacy = RSA2048.replace(/CERTIFICATE REQUEST/g, "NEW CERTIFICATE REQUEST");
    expect(decodeCsr(legacy, {}).error).toBeNull();
  });
  it("renders colon fingerprints and JSON", () => {
    expect(decodeCsr(RSA2048, {}).output).toMatch(/56:35:33:E8/);
    const j = JSON.parse(decodeCsr(RSA2048, { output: "json" }).output);
    expect(j.keySize).toBe(2048);
  });
  it("explains unsupported Ed25519 and bad input", () => {
    expect(decodeCsr(ED25519, {}).error?.message).toMatch(/Ed25519/);
    expect(decodeCsr("hello", {}).error?.message).toMatch(/No certificate request/);
    expect(decodeCsr("", {})).toEqual({ output: "", error: null });
  });
});
