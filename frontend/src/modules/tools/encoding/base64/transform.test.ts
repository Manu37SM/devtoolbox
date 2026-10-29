import { describe, expect, it } from "vitest";
import { transformBase64 } from "./transform";
import type { Base64Options } from "./schema";

const enc: Base64Options = { mode: "encode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" };
const dec: Base64Options = { ...enc, mode: "decode" };

describe("transformBase64", () => {
  it("encodes plain text", () => {
    const result = transformBase64("hello", { mode: "encode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(result).toEqual({ output: "aGVsbG8=", error: null });
  });

  it("decodes plain text", () => {
    const result = transformBase64("aGVsbG8=", { mode: "decode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(result).toEqual({ output: "hello", error: null });
  });

  it("round-trips unicode content", () => {
    const encoded = transformBase64("héllo 🌍", { mode: "encode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    const decoded = transformBase64(encoded.output, { mode: "decode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(decoded.output).toBe("héllo 🌍");
  });

  it("produces URL-safe output without padding when requested", () => {
    const result = transformBase64("subjects?_d", { mode: "encode", urlSafe: true, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(result.output).not.toMatch(/[+/=]/);
  });

  it("decodes URL-safe input", () => {
    const encoded = transformBase64("a?b>c", { mode: "encode", urlSafe: true, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    const decoded = transformBase64(encoded.output, { mode: "decode", urlSafe: true, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(decoded.output).toBe("a?b>c");
  });

  it("returns empty output for empty input", () => {
    expect(transformBase64("", { mode: "encode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" })).toEqual({
      output: "",
      error: null,
    });
  });

  it("returns a structured error for invalid base64 on decode", () => {
    const result = transformBase64("not@@valid!!", { mode: "decode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("shows binary results as hex instead of mangling them", () => {
    expect(transformBase64("MAMCAQA=", dec).output).toBe("30 03 02 01 00");
    expect(transformBase64("aGk=", { ...dec, decodeAs: "hex" }).output).toBe("68 69");
  });

  it("decodes Base64URL and unpadded input without switching modes", () => {
    expect(transformBase64("PDw_Pz4-", dec).output).toBe("<<??>>");
    expect(transformBase64("aGVsbG8", dec).output).toBe("hello");
  });

  it("encodes hex bytes, wraps lines and controls padding", () => {
    expect(transformBase64("30 03 02 01 00", { ...enc, inputFormat: "hex" }).output).toBe("MAMCAQA=");
    expect(transformBase64("a".repeat(60), { ...enc, lineLength: 64 }).output.split("\n").map((l) => l.length)).toEqual([64, 16]);
    expect(transformBase64("hi", { ...enc, padding: "never" }).output).toBe("aGk");
    expect(transformBase64("hi", { ...enc, urlSafe: true, padding: "always" }).output).toBe("aGk=");
  });

  it("reports bad hex and bad characters precisely", () => {
    expect(transformBase64("abc", { ...enc, inputFormat: "hex" }).error?.message).toBe("Hex input has an odd number of digits (3)");
    expect(transformBase64("aGV$bG8=", dec).error?.message).toBe('Invalid Base64 character "$" at position 4');
  });
});

