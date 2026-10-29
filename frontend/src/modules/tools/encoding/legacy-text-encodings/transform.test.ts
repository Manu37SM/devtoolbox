import { describe, expect, it } from "vitest";
import { a85Decode, a85Encode, b45Decode, b45Encode, qpDecode, qpEncode, runLegacyTextEncodings, uuDecode, uuEncode, z85Decode, z85Encode } from "./transform";

const te = (s: string) => new TextEncoder().encode(s);
const td = (b: Uint8Array) => new TextDecoder().decode(b);

describe("Quoted-Printable (matches Python quopri)", () => {
  it("encodes =, non-ASCII and trailing whitespace", () => {
    expect(qpEncode("Café = 5€ ok\nline two  ")).toBe("Caf=C3=A9 =3D 5=E2=82=AC ok\nline two =20");
  });
  it("soft-wraps at 76 characters without splitting escapes", () => {
    expect(qpEncode("x".repeat(100))).toBe(`${"x".repeat(75)}=\n${"x".repeat(25)}`);
    for (const line of qpEncode("é".repeat(60)).split("\n")) expect(line.length).toBeLessThanOrEqual(76);
    expect(td(qpDecode(qpEncode("é".repeat(60))))).toBe("é".repeat(60));
  });
  it("decodes soft breaks", () => expect(td(qpDecode("a=\nb=3D=C3=A9"))).toBe("ab=é"));
});

describe("Ascii85 (matches Python base64.a85encode)", () => {
  it("encodes the classic example and zero groups", () => {
    expect(a85Encode(te("Man is distinguished"))).toBe("<~9jqo^BlbD-BleB1DJ+*+F(f,q~>");
    expect(a85Encode(Uint8Array.from([0, 0, 0, 0, 97, 98, 99]))).toBe("<~z@:E^~>");
    expect(td(a85Decode("BOu!rDZ"))).toBe("hello");
  });
  it("round-trips arbitrary lengths", () => {
    for (let n = 0; n < 9; n++) { const b = Uint8Array.from({ length: n }, (_, i) => (i * 37) & 255); expect([...a85Decode(a85Encode(b))]).toEqual([...b]); }
  });
});

describe("Z85 (ZeroMQ spec)", () => {
  it("encodes the spec test vector", () => {
    expect(z85Encode(Uint8Array.from([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b]))).toBe("HelloWorld");
    expect([...z85Decode("HelloWorld")]).toEqual([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b]);
    expect(() => z85Encode(te("abc"))).toThrow("multiple of 4");
  });
});

describe("Base45 (RFC 9285 examples)", () => {
  it("encodes and decodes", () => {
    expect(b45Encode(te("AB"))).toBe("BB8");
    expect(b45Encode(te("Hello!!"))).toBe("%69 VD92EX0");
    expect(b45Encode(te("base-45"))).toBe("UJCLQE7W581");
    expect(td(b45Decode("QED8WEX0"))).toBe("ietf!");
    expect(() => b45Decode("GGW")).toThrow("out of range");
  });
});

describe("uuencode (matches Python binascii.b2a_uu backtick=True)", () => {
  it("encodes lines and decodes full files", () => {
    expect(uuEncode(te("Cat")).split("\n")[1]).toBe("#0V%T");
    expect(uuEncode(te("Hello, World!")).split("\n")[1]).toBe("-2&5L;&\\L(%=O<FQD(0``");
    expect(td(uuDecode(uuEncode(te("x".repeat(100)))))).toBe("x".repeat(100));
    expect(td(uuDecode("begin 644 a\n#0V%T\n`\nend"))).toBe("Cat");
  });
});

describe("runLegacyTextEncodings", () => {
  it("shows binary results as hex", () => {
    expect(runLegacyTextEncodings("HelloWorld", { encoding: "z85", direction: "decode" }).output).toBe("(binary, 8 bytes, shown as hex)\n86 4F D2 6F B5 59 F7 5B");
  });
  it("reports invalid characters", () => {
    expect(runLegacyTextEncodings("ab~", { encoding: "base45", direction: "decode" }).error?.message).toContain("Invalid Base45");
  });
});
