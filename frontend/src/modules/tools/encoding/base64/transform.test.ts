import { describe, expect, it } from "vitest";
import { transformBase64 } from "./transform";

describe("transformBase64", () => {
  it("encodes plain text", () => {
    const result = transformBase64("hello", { mode: "encode", urlSafe: false });
    expect(result).toEqual({ output: "aGVsbG8=", error: null });
  });

  it("decodes plain text", () => {
    const result = transformBase64("aGVsbG8=", { mode: "decode", urlSafe: false });
    expect(result).toEqual({ output: "hello", error: null });
  });

  it("round-trips unicode content", () => {
    const encoded = transformBase64("héllo 🌍", { mode: "encode", urlSafe: false });
    const decoded = transformBase64(encoded.output, { mode: "decode", urlSafe: false });
    expect(decoded.output).toBe("héllo 🌍");
  });

  it("produces URL-safe output without padding when requested", () => {
    const result = transformBase64("subjects?_d", { mode: "encode", urlSafe: true });
    expect(result.output).not.toMatch(/[+/=]/);
  });

  it("decodes URL-safe input", () => {
    const encoded = transformBase64("a?b>c", { mode: "encode", urlSafe: true });
    const decoded = transformBase64(encoded.output, { mode: "decode", urlSafe: true });
    expect(decoded.output).toBe("a?b>c");
  });

  it("returns empty output for empty input", () => {
    expect(transformBase64("", { mode: "encode", urlSafe: false })).toEqual({
      output: "",
      error: null,
    });
  });

  it("returns a structured error for invalid base64 on decode", () => {
    const result = transformBase64("not@@valid!!", { mode: "decode", urlSafe: false });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });
});
