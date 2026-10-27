import { describe, expect, it } from "vitest";
import { base64ToUtf8, convertBasicAuth, utf8ToBase64 } from "./transform";

const enc = { mode: "encode", format: "header" } as const;
const dec = { mode: "decode", format: "header" } as const;

describe("base64 helpers", () => {
  it("round-trips unicode", () => {
    expect(base64ToUtf8(utf8ToBase64("ünï:pässwörd 🔑"))).toBe("ünï:pässwörd 🔑");
  });
  it("accepts unpadded and URL-safe input", () => {
    expect(base64ToUtf8("YWxpY2U6cHc")).toBe("alice:pw");
    expect(base64ToUtf8(utf8ToBase64("a?b>c:d").replace(/\+/g, "-").replace(/\//g, "_"))).toBe("a?b>c:d");
  });
});

describe("encode", () => {
  it("matches the RFC 7617 example", () => {
    expect(convertBasicAuth("Aladdin:open sesame", enc).output).toBe("Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==");
  });
  it("supports each output format", () => {
    expect(convertBasicAuth("a:b", { ...enc, format: "value" }).output).toBe("Basic YTpi");
    expect(convertBasicAuth("a:b", { ...enc, format: "base64" }).output).toBe("YTpi");
    expect(convertBasicAuth("a:b", { ...enc, format: "curl" }).output).toContain('-H "Authorization: Basic YTpi"');
  });
  it("allows colons in the password and requires one separator", () => {
    expect(convertBasicAuth("u:p:q", { ...enc, format: "base64" }).output).toBe(utf8ToBase64("u:p:q"));
    expect(convertBasicAuth("nocolon", enc).error).not.toBeNull();
  });
});

describe("decode", () => {
  it("accepts a full header, 'Basic …' or bare base64", () => {
    const expected = "username: Aladdin\npassword: open sesame";
    for (const s of ["Authorization: Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==", "basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==", "QWxhZGRpbjpvcGVuIHNlc2FtZQ=="]) {
      expect(convertBasicAuth(s, dec).output).toBe(expected);
    }
  });
  it("splits at the first colon only", () => {
    expect(convertBasicAuth(utf8ToBase64("u:p:q"), dec).output).toBe("username: u\npassword: p:q");
  });
  it("reports invalid input", () => {
    expect(convertBasicAuth("!!!not base64!!!", dec).error).not.toBeNull();
    expect(convertBasicAuth(utf8ToBase64("nocolon"), dec).error?.message).toMatch(/colon/);
    expect(convertBasicAuth("/w==", dec).error).not.toBeNull(); // 0xFF is not UTF-8
  });
  it("handles empty input", () => {
    expect(convertBasicAuth("", dec)).toEqual({ output: "", error: null });
  });
});
