import { describe, expect, it } from "vitest";
import { maskValue, parseIso8583, runIso8583Parser } from "./transform";

/** Independent test-side builder: ASCII message with a hex bitmap. */
function build(mti: string, fields: Record<number, string>, varLen: Record<number, number> = {}): string {
  const nums = Object.keys(fields).map(Number).sort((a, b) => a - b);
  const bits = new Array(nums.some((n) => n > 64) ? 128 : 64).fill(0);
  if (bits.length === 128) bits[0] = 1;
  for (const n of nums) bits[n - 1] = 1;
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4).join(""), 2).toString(16).toUpperCase();
  return mti + hex + nums.map((n) => (varLen[n] ? String(fields[n]!.length).padStart(varLen[n]!, "0") : "") + fields[n]).join("");
}

const PURCHASE = build("0200", { 2: "4111111111111111", 3: "000000", 4: "000000012550", 7: "0131101530", 11: "123456", 12: "161530", 13: "0131", 22: "051", 25: "00", 35: "4111111111111111=2512101", 37: "403110123456", 41: "TERM0001", 42: "MERCHANT0000001", 49: "356" }, { 2: 2, 35: 2 });

describe("parseIso8583", () => {
  it("reads MTI, bitmap and fixed/LLVAR fields", () => {
    expect(PURCHASE.slice(4, 20)).toBe("7238048028C08000");
    const p = parseIso8583(PURCHASE, "ascii");
    expect(p.mti).toBe("0200");
    expect(p.fields.map((f) => f.no)).toEqual([2, 3, 4, 7, 11, 12, 13, 22, 25, 35, 37, 41, 42, 49]);
    expect(p.fields.find((f) => f.no === 35)!.raw).toBe("4111111111111111=2512101");
    expect(p.trailing).toBe(0);
  });
  it("handles a secondary bitmap", () => {
    const msg = build("0800", { 7: "0131101530", 11: "000001", 70: "301" });
    const p = parseIso8583(msg, "ascii");
    expect(p.bitmapHex).toBe("82200000000000000400000000000000");
    expect(p.fields.map((f) => f.no)).toEqual([1, 7, 11, 70]);
  });
  it("decodes BCD-packed messages", () => {
    // MTI 0200, bitmap: fields 2,3,4,11 -> 7020000000000000; PAN 16 digits BCD with LL=16; F3 000000; F4 000000001000; F11 000777
    const hex = "0200" + "7020000000000000" + "16" + "4111111111111111" + "000000" + "000000001000" + "000777";
    const p = parseIso8583(hex, "bcd");
    expect(p.fields.map((f) => [f.no, f.raw])).toEqual([[2, "4111111111111111"], [3, "000000"], [4, "000000001000"], [11, "000777"]]);
  });
  it("decodes ASCII messages with a binary bitmap from hex", () => {
    const text = "0800";
    const hex = [...text].map((c) => c.charCodeAt(0).toString(16)).join("") + "0220000000000000" + [..."0131101530000001"].map((c) => c.charCodeAt(0).toString(16)).join("");
    expect(parseIso8583(hex, "ascii-binary-bitmap").fields.map((f) => f.raw)).toEqual(["0131101530", "000001"]);
  });
  it("reports truncated and malformed messages", () => {
    expect(() => parseIso8583(PURCHASE.slice(0, 30), "ascii")).toThrow(/Message ended while reading field 2/);
    expect(() => parseIso8583("02X0", "ascii")).toThrow(/MTI/);
    expect(() => parseIso8583("0200ZZZZZZZZZZZZZZZZ", "ascii")).toThrow(/binary bitmap/);
  });
});

describe("runIso8583Parser", () => {
  it("explains MTI and fields and masks card data", () => {
    const out = runIso8583Parser(PURCHASE, { encoding: "ascii", maskSensitive: true }).output;
    expect(out).toContain("MTI 0200: ISO 8583:1987, Financial Request from Acquirer");
    expect(out).toContain('"411111******1111"');
    expect(out).toContain('"411111******1111=*******"');
    expect(out).toContain('"000000012550"  125.50 INR');
    expect(out).toContain("Purchase (goods and services); from default/unspecified");
    expect(out).toContain("chip (contact); PIN capability yes");
    expect(out).toContain("PCI DSS");
    expect(out).not.toContain("4111111111111111");
  });
  it("shows raw values when masking is off and names response codes", () => {
    const resp = build("0210", { 3: "000000", 11: "123456", 39: "51" });
    const out = runIso8583Parser(resp, { encoding: "ascii", maskSensitive: false }).output;
    expect(out).toContain("Financial Request response from Acquirer");
    expect(out).toContain('"51"  Insufficient funds');
  });
  it("masks helpers", () => {
    expect(maskValue(2, "5500000000000004")).toBe("550000******0004");
    expect(maskValue(52, "1234ABCD1234ABCD")).toBe("****************");
  });
});
