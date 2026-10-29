import { describe as group, expect, it } from "vitest";
import { hexToBytes } from "@/lib/byte-input";
import { parseTlv, runEmvTlvDecoder } from "./transform";

const ARQC = "9F2701809F360200019F2608AABBCCDDEEFF0011" + "950580000480009A032401319C01005F2A0203569F02060000000125509F1A020356"
  + "5A0841111111111111115F3401019F34034203029F21031530005F200A4A4F484E20534D495448";
const FCI = "6F1A840E315041592E5359532E4444463031A5088801025F2D02656E";

group("parseTlv", () => {
  it("reads multi-byte tags, lengths and nesting", () => {
    expect(parseTlv(hexToBytes(ARQC)).map((t) => t.tag)).toEqual(["9F27", "9F36", "9F26", "95", "9A", "9C", "5F2A", "9F02", "9F1A", "5A", "5F34", "9F34", "9F21", "5F20"]);
    const fci = parseTlv(hexToBytes(FCI))[0]!;
    expect(fci.tag).toBe("6F");
    expect(fci.children.map((c) => c.tag)).toEqual(["84", "A5"]);
    expect(fci.children[1]!.children.map((c) => c.tag)).toEqual(["88", "5F2D"]);
    expect(parseTlv(hexToBytes("9F02820003000001"))[0]!.length).toBe(3);
  });
  it("skips padding and reports truncation", () => {
    expect(parseTlv(hexToBytes("009F360200FF")).map((t) => t.tag)).toEqual(["9F36"]);
    expect(() => parseTlv(hexToBytes("9F2608AABB"))).toThrow(/declares 8 bytes but only 2 remain/);
  });
});

group("runEmvTlvDecoder", () => {
  it("explains cryptogram data and masks card data", () => {
    const out = runEmvTlvDecoder(ARQC, { maskSensitive: true, explainBits: true }).output;
    expect(out).toContain("9F27 Cryptogram Information Data (CID) [1]: 80\n    ARQC (online authorisation requested)");
    expect(out).toContain("9F36 Application Transaction Counter (ATC) [2]: 0001\n    ATC 1");
    expect(out).toContain("byte 1 b8: Offline data authentication was not performed");
    expect(out).toContain("byte 3 b3: Online PIN entered");
    expect(out).toContain("byte 4 b8: Transaction exceeds floor limit");
    expect(out).toContain("9A Transaction Date (YYMMDD) [3]: 240131\n    2024-01-31");
    expect(out).toContain("5F2A Transaction Currency Code [2]: 0356\n    INR");
    expect(out).toContain("9F02 Amount, Authorised (Numeric) [6]: 000000012550\n    125.50");
    expect(out).toContain("5A Application Primary Account Number (PAN) [8]: 411111******1111");
    expect(out).toContain("Enciphered PIN verified online (apply next CVM if unsuccessful); result successful");
    expect(out).toContain('5F20 Cardholder Name [10]: "**********" (10 characters, masked)');
    expect(out).not.toContain("JOHN");
    expect(out).toContain("PCI DSS");
  });
  it("shows raw values when masking is off and nests templates", () => {
    const out = runEmvTlvDecoder(FCI + "5713" + "4111111111111111D25121010000000000000F", { maskSensitive: false, explainBits: false }).output;
    expect(out).toContain("6F File Control Information (FCI) Template (26 bytes)\n  84 Dedicated File (DF) Name [14]: 315041592E5359532E4444463031");
    expect(out).toContain('    5F2D Language Preference [2]: "en"');
    expect(out).toContain("57 Track 2 Equivalent Data [19]: 4111111111111111D25121010000000000000F\n    expiry 2025-12, service code 101");
  });
});
