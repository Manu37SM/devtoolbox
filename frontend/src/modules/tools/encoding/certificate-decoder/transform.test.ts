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

// Generated with openssl 3: an EC P-256 leaf (SANs, EKU) signed by an RSA-2048 root.
// Expected fingerprints and fields come from `openssl x509 -noout -fingerprint -ext ... -nameopt RFC2253`.
const LEAF = `-----BEGIN CERTIFICATE-----
MIIC7jCCAdagAwIBAgIUT4cTIfg5JK8M4ZHFumJz1nQAyHMwDQYJKoZIhvcNAQEL
BQAwOTELMAkGA1UEBhMCSU4xETAPBgNVBAoMCEFjbWUgTHRkMRcwFQYDVQQDDA5B
Y21lIFRlc3QgUm9vdDAeFw0yNjEwMzAwODA4MzFaFw0yOTAyMDEwODA4MzFaMDgx
CzAJBgNVBAYTAklOMREwDwYDVQQKDAhBY21lIEx0ZDEWMBQGA1UEAwwNYXBpLmFj
bWUudGVzdDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABDRpYNVTalfI7MxGspuF
2RLoQA4epEq3ggVmkz5VLp/cCw7+/WvDL9JaJqxPJD3wIJiO/f99k3ULPK+AjF3r
iHKjgbkwgbYwOgYDVR0RBDMwMYINYXBpLmFjbWUudGVzdIILKi5hY21lLnRlc3SH
BAoAAAWBDW9wc0BhY21lLnRlc3QwHQYDVR0lBBYwFAYIKwYBBQUHAwEGCCsGAQUF
BwMCMA4GA1UdDwEB/wQEAwIHgDAJBgNVHRMEAjAAMB0GA1UdDgQWBBSjvdxWGrcv
rv30ujH7IXfh2qtxPDAfBgNVHSMEGDAWgBSYF7l+1n3/ypYKpp8yt5LsG/RrbzAN
BgkqhkiG9w0BAQsFAAOCAQEAjyKimf6/eHfnJhrw42rqb3TErzgnxMPRKPf55DM1
r1d8HSWdqgpI3IPcededi0WnLrlvFLkOrMKI/UBmiwEe0U7ow4eCLedF4FsjkwuA
4SXXxVGoYo1nAOh+qsWpfs1C6pnRxeD4L0RBIVvjmbHLpxpOR+2isefnjvaZJOGV
ApLbS8VU9sgLD9jbg4j9QOl+I5Rjzm5cVBd5Oh55SNJ2208UUppHpoAdHniwPhcA
rxpuqnnFsfM5uQJO8va2Wzr4x3Yn0Z3YM/FdtLb6yAPYhSPTSMoZX4N3yw2+AFeW
mJ5dJfoA/Ek/NZqX4oza33lZRc1xUGlRzRWHFTrrvRSp+w==
-----END CERTIFICATE-----`;
const ROOT = `-----BEGIN CERTIFICATE-----
MIIDYzCCAkugAwIBAgIUUT7CvWXiUU4LjC+CFIBuUqkOjegwDQYJKoZIhvcNAQEL
BQAwOTELMAkGA1UEBhMCSU4xETAPBgNVBAoMCEFjbWUgTHRkMRcwFQYDVQQDDA5B
Y21lIFRlc3QgUm9vdDAeFw0yNjEwMzAwODA4MzFaFw0zNjEwMjcwODA4MzFaMDkx
CzAJBgNVBAYTAklOMREwDwYDVQQKDAhBY21lIEx0ZDEXMBUGA1UEAwwOQWNtZSBU
ZXN0IFJvb3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCwNuz9Aovz
09K3bZVgNbdGBgnS0e9IyFUeBO7zbvXkVDauEpVx7U1EMmWlB7ZVnxZ1VToUK36o
qZrogPykRX6JkYc8PD2NUcCHdqBlGQuVrP2ZYDWaix10Zo7IxAF/pTxPd/nVZR0j
U0IJMJFprZpY8WAksyDLiwD4OA1+gY+EFYYzJxxsM1mpkMRrWDQmOgTmTLVJUN6U
KG4roJaROtzEpH/cZvJ9XPNtSEKq3SsvMwsUqkMMKntvijLv5Widf/8Scv4nREfq
d3Qu41WLmwfzBsuev2q4m290xQlWYjT3MoLNTuQP7O/fsGepDTTT7QN7fKtmJDyw
NchzTFs2pWw/AgMBAAGjYzBhMB0GA1UdDgQWBBSYF7l+1n3/ypYKpp8yt5LsG/Rr
bzAfBgNVHSMEGDAWgBSYF7l+1n3/ypYKpp8yt5LsG/RrbzAPBgNVHRMBAf8EBTAD
AQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQsFAAOCAQEAV7KRsaJNnX/1
gPcvmqCgj+oMUjRsbFShiJCliEUuEi7xur1rbDE8VRlY/Aegjg3Wgiy49qVkw7ij
uqXSDbHyEMevaKp/ogkcbGxB3JIqBlBSb/JEhKob+bzAFLJZlCsydWndfFcjqLvS
TdozRh8kQYUrmQ88+wxVpJXcl/ySliNfZeb/g1SrLul7T9sE4E6ihOgnGE5kTqE6
9I3WOwiHBsOu2DvBhyNIFo9n+j6oyYIAycSlgUuVu0DLR3VH+P539NDXgi7jD7Ef
cvhlHFPSlasHSL45DA2lBkrGXg9gldO/XmmqI24ne/Q+YtfXH5CIGekBB5pD4DPx
iv9u2Fl94w==
-----END CERTIFICATE-----`;
const NOW = new Date("2027-01-01T00:00:00Z");

describe("decodeCertificate — extended fields and options", () => {
  it("matches openssl for fingerprints, SANs, key usage and key size", () => {
    const r = decodeCertificate(LEAF, {}, NOW).info!;
    expect(r.sha256Fingerprint).toBe("ED:0F:4E:6B:98:F0:55:FD:BC:C6:DE:4E:23:DC:1B:0B:BD:7F:D8:CA:B5:8E:20:40:5A:83:41:4D:D7:59:9F:2F");
    expect(r.sha1Fingerprint).toBe("DA:95:9C:5C:58:3E:A4:8E:55:74:ED:E7:B8:5A:49:32:3C:A9:84:C2");
    expect(r.subjectAltNames).toEqual(["DNS:api.acme.test", "DNS:*.acme.test", "IP:10.0.0.5", "email:ops@acme.test"]);
    expect(r.extendedKeyUsage).toEqual(["serverAuth", "clientAuth"]);
    expect(r.keyUsage).toEqual(["digitalSignature"]);
    expect(r.isCA).toBe(false);
    expect(r).toMatchObject({ publicKeyAlgorithm: "EC (secp256r1)", keySize: 256 });
    expect(decodeCertificate(ROOT, {}, NOW).info).toMatchObject({ isCA: true, keySize: 2048, keyUsage: ["keyCertSign", "cRLSign"] });
  });

  it("formats DNs and fingerprints", () => {
    const r = decodeCertificate(LEAF, { dnStyle: "rfc2253", fingerprintStyle: "hex" }, NOW).info!;
    expect(r.subject).toBe("CN=api.acme.test,O=Acme Ltd,C=IN");
    expect(r.issuer).toBe("CN=Acme Test Root,O=Acme Ltd,C=IN");
    expect(r.sha256Fingerprint).toBe("ed0f4e6b98f055fdbcc6de4e23dc1b0bbd7fd8cab58e20405a83414dd7599f2f");
  });

  it("decodes and verifies a chain", () => {
    const r = decodeCertificate(`${LEAF}\n${ROOT}`, {}, NOW);
    expect(r.chain).toHaveLength(2);
    expect(r.chain![0]!.signedByNext).toBe(true);
    const reversed = decodeCertificate(`${ROOT}\n${LEAF}`, {}, NOW);
    expect(reversed.chain![0]!.signedByNext).toBe(false);
    expect(reversed.chain![0]!.warnings!.join(" ")).toContain("out of order");
  });

  it("warns about expiry and reads bare base64 DER", () => {
    expect(decodeCertificate(LEAF, { expiryWarningDays: 30 }, new Date("2029-01-20T00:00:00Z")).info!.warnings).toContain("Expires in 12 day(s).");
    expect(decodeCertificate(LEAF, {}, new Date("2030-01-01T00:00:00Z")).info!.warnings![0]).toMatch(/^Expired \d+ day/);
    const der = LEAF.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    expect(decodeCertificate(der, {}, NOW).info!.subject).toBe("/C=IN/O=Acme Ltd/CN=api.acme.test");
  });
});

