import { describe, expect, it } from "vitest";
import { parsePemBlocks, pemToolkit } from "./transform";

const C1 = `-----BEGIN CERTIFICATE-----
MIIBmDCCAT+gAwIBAgIUEO8uzsgtp+mj7xXr6vYiUerErYAwCgYIKoZIzj0EAwIw
IjERMA8GA1UEAwwIUm9vdCBPbmUxDTALBgNVBAoMBEFjbWUwHhcNMjYxMDMxMDgw
NDAzWhcNMjcxMDMxMDgwNDAzWjAiMREwDwYDVQQDDAhSb290IE9uZTENMAsGA1UE
CgwEQWNtZTBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABHZLG6RPl4dUuzRG4uAU
WTcv9Edi/mcJVK41I9WagQyvLDIhvKBiFAGr1Frt40RXIPxZv7lZYIk+5ftfBrKu
5JGjUzBRMB0GA1UdDgQWBBSb4tXgmHNs5ZP4GYRSVb9zm1xfaDAfBgNVHSMEGDAW
gBSb4tXgmHNs5ZP4GYRSVb9zm1xfaDAPBgNVHRMBAf8EBTADAQH/MAoGCCqGSM49
BAMCA0cAMEQCICrTy6/lFU04K9W0BjtSv979gMOwlh7dFXUksrrc2uSDAiBVy2ha
WJ8GeA5bUAprFTgDIalur9xDwLaXj8YMUr8wWw==
-----END CERTIFICATE-----`;
const C2 = `-----BEGIN CERTIFICATE-----
MIIBejCCASGgAwIBAgIUCU42whVwoJJ51gwXgSBuwk8oYz8wCgYIKoZIzj0EAwIw
EzERMA8GA1UEAwwITGVhZiBUd28wHhcNMjYxMDMxMDgwNDAzWhcNMjcwMTI5MDgw
NDAzWjATMREwDwYDVQQDDAhMZWFmIFR3bzBZMBMGByqGSM49AgEGCCqGSM49AwEH
A0IABPWEqftGx5GWmMeN5Tom3v1uRMDVwDlRnIKJeNQXtLBa5MwppKcyjouFMvYe
s/PO3oWw7l8YLz+oNqQM6aFVC3SjUzBRMB0GA1UdDgQWBBSmj0PWzdOpu8vXkVJX
lfwAJuMVmDAfBgNVHSMEGDAWgBSmj0PWzdOpu8vXkVJXlfwAJuMVmDAPBgNVHRMB
Af8EBTADAQH/MAoGCCqGSM49BAMCA0cAMEQCIFdUuSWqoWbOd3dFfjW8ri7mYXYR
UkltZgn2x8QAsnCwAiBeSp86IhjGeMuOlxR677rKd6e41rnJyEs4c3CfR9Cx/A==
-----END CERTIFICATE-----`;
const CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIBRzCB7wIBADBQMQswCQYDVQQGEwJJTjEUMBIGA1UECAwLTWFoYXJhc2h0cmEx
FTATBgNVBAoMDEFjbWUgUHZ0IEx0ZDEUMBIGA1UEAwwLZXhhbXBsZS5jb20wWTAT
BgcqhkjOPQIBBggqhkjOPQMBBwNCAAQIhbsRRQmMrCaqsZnWiE2UDtLpbzzmG8gl
KmVwqT9gZUEfguMjTa5R2Qm4O7HZBfDxxWP+RRautCckjexeawvqoD0wOwYJKoZI
hvcNAQkOMS4wLDAaBgNVHREEEzARgg9hcGkuZXhhbXBsZS5jb20wDgYDVR0PAQH/
BAQDAgWgMAoGCCqGSM49BAMDA0cAMEQCICiLAHgSlabL6S6Kj7JbadApHfjoaxhI
XF4bFRhSH9ThAiAGjONpJPfIQr7Msm+Ak2mRSzME6UMeZdJKiPT8KGqlLA==
-----END CERTIFICATE REQUEST-----`;
const BUNDLE = [C1, C2, C1, CSR].join("\n");

describe("pemToolkit", () => {
  it("lists blocks with openssl-verified sha256 and validity", () => {
    const out = pemToolkit(BUNDLE, { action: "list" }).output;
    expect(out).toContain("4 blocks found");
    expect(out).toContain("1. CERTIFICATE — 412 bytes");
    expect(out).toContain("854819b0fa9f86b347d4fef86a99eedb321c41568d17a859e778f7e7639bf11d");
    expect(out).toContain("a7d5e13cb3d8e2d2dd18603b7c5b0f2bf7de56656f4dad57a5dd65f7b49c7011");
    expect(out).toContain("valid:   2026-10-31 to 2027-10-31");
    expect(out).toContain("valid:   2026-10-31 to 2027-01-29");
    expect(out).toContain("CERTIFICATE REQUEST");
  });
  it("filters by label", () => {
    expect(pemToolkit(BUNDLE, { action: "list", labelFilter: "certificate request" }).output).toContain("1 block found");
    expect(pemToolkit(BUNDLE, { action: "list", labelFilter: "PRIVATE KEY" }).error?.message).toMatch(/Found: CERTIFICATE, CERTIFICATE REQUEST/);
  });
  it("extracts one block or all", () => {
    expect(pemToolkit(BUNDLE, { action: "extract", index: 2 }).output).toBe(C2);
    expect(pemToolkit(BUNDLE, { action: "extract", index: 9 }).error).not.toBeNull();
    expect(parsePemBlocks(pemToolkit(BUNDLE, { action: "extract", index: 0 }).output)).toHaveLength(4);
  });
  it("rewraps to a different width and CRLF", () => {
    const out = pemToolkit(C1, { action: "rewrap", lineWidth: 76, eol: "crlf" }).output;
    const body = out.split("\r\n").slice(1, -1);
    expect(body.slice(0, -1).every((l) => l.length === 76)).toBe(true);
    expect(parsePemBlocks(out)[0]!.base64).toBe(parsePemBlocks(C1)[0]!.base64);
  });
  it("strips headers, reverses and dedupes", () => {
    expect(pemToolkit(C1, { action: "strip" }).output).toBe(parsePemBlocks(C1)[0]!.base64);
    expect(parsePemBlocks(pemToolkit(BUNDLE, { action: "reverse" }).output)[0]!.label).toBe("CERTIFICATE REQUEST");
    expect(parsePemBlocks(pemToolkit(BUNDLE, { action: "dedupe" }).output)).toHaveLength(3);
  });
  it("round-trips DER as base64 and hex", () => {
    const hex = pemToolkit(C1, { action: "to-der", derFormat: "hex" }).output;
    expect(hex).toHaveLength(412 * 2);
    expect(hex.startsWith("308201")).toBe(true);
    const back = pemToolkit(hex, { action: "from-der", derFormat: "hex" }).output;
    expect(back).toBe(C1);
    const b64 = pemToolkit(C1, { action: "to-der" }).output;
    expect(pemToolkit(b64, { action: "from-der", label: "certificate" }).output).toBe(C1);
    expect(pemToolkit(C1, { action: "to-der", derFormat: "hex-spaced" }).output.slice(0, 11)).toBe("30 82 01 98");
  });
  it("explains bad input", () => {
    expect(pemToolkit("hello", {}).error?.message).toMatch(/No PEM blocks/);
    expect(pemToolkit("!!!", { action: "from-der" }).error).not.toBeNull();
    expect(pemToolkit("", {})).toEqual({ output: "", error: null });
  });
});
