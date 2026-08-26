import { describe, expect, it } from "vitest";
import { decodeCertificate } from "./transform";

const TEST_CERT_PEM = `-----BEGIN CERTIFICATE-----
MIIDoTCCAomgAwIBAgIUQGV/872lqhKRFnMXM6kAgEIE33swDQYJKoZIhvcNAQEL
BQAwYDELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMQswCQYDVQQHDAJTRjETMBEG
A1UECgwKRGV2VG9vbGJveDEMMAoGA1UECwwDRW5nMRQwEgYDVQQDDAtleGFtcGxl
LmNvbTAeFw0yNjA4MjYxMDA5MDdaFw0yNzA4MjYxMDA5MDdaMGAxCzAJBgNVBAYT
AlVTMQswCQYDVQQIDAJDQTELMAkGA1UEBwwCU0YxEzARBgNVBAoMCkRldlRvb2xi
b3gxDDAKBgNVBAsMA0VuZzEUMBIGA1UEAwwLZXhhbXBsZS5jb20wggEiMA0GCSqG
SIb3DQEBAQUAA4IBDwAwggEKAoIBAQDglpo1ARSmGPmP6JHyqaxl1yTXcnLAhbWZ
7bBmicvNDQ/IL4GSVNKPmjFdePen6YVB6RD56rfAJsSM5rTN5iyTlKV89eqZWMI0
C6HjEV11WEF1ruuT630mjtxzj6DUpPDLjf3IeUpzYCsG0KusL3STxGjT7kUOiivl
/dFoTyIPo7UBSSLLeVvbGzvt1GykhKvELwZ66663erYJdWJcfehsgHhOmrgtwI2b
msLnE257ulyRldspqziJ6h46y5E2rcGg6geHQRLIZxDCESTNpZhofpXPhsc0vWWR
wxr0gQDN/uv7bM6OcNDWJfMwHg2s4pOOhNtgjmfmtAXe3HQ7WLRRAgMBAAGjUzBR
MB0GA1UdDgQWBBTQ174kfVU/MnNCCcHpPjF+lUy6nDAfBgNVHSMEGDAWgBTQ174k
fVU/MnNCCcHpPjF+lUy6nDAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUA
A4IBAQA0wEsTvAG9f1OYf8eyq7lYnRdxEl+kqRrjSChXLj1dTzN3vx2Uad0ZvZ4S
f2JwV3fgZVhVu2syiXdJiPmTqSvnNXzsRU1rtF2cEuK77zEbfzUoF23+f05lmrmZ
D4xsBNGryGy+3fscDaACCnb8yQTytx6qJ2moY2tox479YyJ9a0rZCBQRGm3eNL7s
ToyCOaMDTTqYVwSszMYcKF8c7xTkv94WZbhFBIj077O5e2pxVLQ1IcZNJOATvDz7
FuOKfbWDp5RugeZSGp5IzOE+fayooWqT0J5OTG37pG34fsDAjQt/ogPLVKzCO/Dg
RgifTlmqnxTnvUotPkL8B25r3hPj
-----END CERTIFICATE-----`;

describe("decodeCertificate", () => {
  it("parses subject, issuer, and serial number", () => {
    const result = decodeCertificate(TEST_CERT_PEM);
    expect(result.error).toBeNull();
    expect(result.info?.subject).toBe("/C=US/ST=CA/L=SF/O=DevToolbox/OU=Eng/CN=example.com");
    expect(result.info?.issuer).toBe(result.info?.subject);
    expect(result.info?.isSelfSigned).toBe(true);
    expect(result.info?.serialNumberHex).toBe("40657ff3bda5aa129116731733a900804204df7b");
  });

  it("parses the validity window as ISO dates", () => {
    const result = decodeCertificate(TEST_CERT_PEM);
    expect(result.info?.notBefore).toBe("2026-08-26T10:09:07.000Z");
    expect(result.info?.notAfter).toBe("2027-08-26T10:09:07.000Z");
  });

  it("reports the signature and public key algorithms", () => {
    const result = decodeCertificate(TEST_CERT_PEM);
    expect(result.info?.signatureAlgorithm).toBe("SHA256withRSA");
    expect(result.info?.publicKeyAlgorithm).toBe("RSA");
    expect(result.info?.version).toBe(3);
  });

  it("returns null info/error for empty input", () => {
    expect(decodeCertificate("")).toEqual({ info: null, error: null });
  });

  it("errors on input that isn't a PEM certificate block", () => {
    const result = decodeCertificate("not a certificate");
    expect(result.error).not.toBeNull();
    expect(result.info).toBeNull();
  });

  it("errors on a malformed PEM block", () => {
    const result = decodeCertificate("-----BEGIN CERTIFICATE-----\nnotbase64!!!\n-----END CERTIFICATE-----");
    expect(result.error).not.toBeNull();
  });
});
