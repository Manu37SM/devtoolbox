import { describe, expect, it } from "vitest";
import { lookup, parseIana, runTlsCipherSuiteLookup } from "./transform";
import { SUITES } from "./suites";

describe("suite table", () => {
  it("has unique codes and IANA names", () => {
    expect(new Set(SUITES.map((s) => s[0])).size).toBe(SUITES.length);
    expect(new Set(SUITES.map((s) => s[1])).size).toBe(SUITES.length);
    expect(SUITES.length).toBeGreaterThan(150);
  });
});

describe("lookup", () => {
  it("finds suites by IANA name, OpenSSL name and hex code", () => {
    expect(lookup("ECDHE-RSA-AES128-GCM-SHA256")).toMatchObject({ iana: "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256", hex: "C02F", rating: "recommended", pfs: true });
    expect(lookup("0xC0,0x2F")!.openssl).toBe("ECDHE-RSA-AES128-GCM-SHA256");
    expect(lookup("c02f")!.iana).toBe("TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256");
    expect(lookup("TLS_AES_256_GCM_SHA384")).toMatchObject({ hex: "1302", protocol: "TLSv1.3", rating: "recommended" });
  });
  it("rates weak and insecure suites with reasons", () => {
    const cbc = lookup("TLS_RSA_WITH_AES_128_CBC_SHA")!;
    expect(cbc.rating).toBe("weak");
    expect(cbc.reasons.join(" ")).toMatch(/CBC mode.*no forward secrecy/);
    expect(lookup("DES-CBC3-SHA")!.reasons[0]).toContain("Sweet32");
    expect(lookup("RC4-SHA")!.rating).toBe("insecure");
    expect(lookup("AECDH-NULL-SHA")!.reasons).toEqual(["no encryption (NULL cipher)", "anonymous key exchange: no server authentication, trivial man-in-the-middle"]);
    expect(lookup("DHE-RSA-AES256-GCM-SHA384")!.rating).toBe("secure");
    expect(lookup("TLS_AES_128_CCM_8_SHA256")!.rating).toBe("secure");
  });
  it("parses unknown IANA names structurally", () => {
    expect(parseIana("TLS_ECDHE_ECDSA_WITH_ARIA_256_GCM_SHA384")).toMatchObject({ kex: "ECDHE", auth: "ECDSA", cipher: "ARIA_256_GCM", mac: "AEAD", pfs: true });
    expect(lookup("TLS_FOO_WITH_BAR_SHA")!.hex).toBe("?");
    expect(lookup("nope")).toBeNull();
  });
});

describe("runTlsCipherSuiteLookup", () => {
  it("accepts an OpenSSL cipher string and sorts by rating", () => {
    const out = runTlsCipherSuiteLookup("ECDHE-RSA-AES128-GCM-SHA256:AES128-SHA:RC4-MD5", { sort: "rating" }).output;
    expect(out.split("\n")[0]).toBe("1 insecure, 1 weak, 1 recommended");
    expect(out.indexOf("TLS_RSA_WITH_RC4_128_MD5")).toBeLessThan(out.indexOf("TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"));
  });
  it("handles hex pairs from packet captures", () => {
    expect(runTlsCipherSuiteLookup("0x13 0x01", { sort: "input" }).output).toContain("TLS_AES_128_GCM_SHA256");
  });
});
