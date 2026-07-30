import { describe, expect, it } from "vitest";
import { transformUrlEncode } from "./transform";

describe("transformUrlEncode", () => {
  it("encodes reserved characters with component mode", () => {
    const result = transformUrlEncode("a b&c=d", { mode: "encode", component: true });
    expect(result).toEqual({ output: "a%20b%26c%3Dd", error: null });
  });

  it("encodeURI leaves URL-structural characters untouched", () => {
    const result = transformUrlEncode("https://a.com/x?y=1&z=2", {
      mode: "encode",
      component: false,
    });
    expect(result.output).toBe("https://a.com/x?y=1&z=2");
  });

  it("decodes percent-encoded text", () => {
    const result = transformUrlEncode("a%20b%26c", { mode: "decode", component: true });
    expect(result).toEqual({ output: "a b&c", error: null });
  });

  it("returns empty output for empty input", () => {
    expect(transformUrlEncode("", { mode: "encode", component: true })).toEqual({
      output: "",
      error: null,
    });
  });

  it("returns a structured error for malformed percent-encoding on decode", () => {
    const result = transformUrlEncode("%E0%A4%A", { mode: "decode", component: true });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("round-trips unicode", () => {
    const encoded = transformUrlEncode("café ☕", { mode: "encode", component: true });
    const decoded = transformUrlEncode(encoded.output, { mode: "decode", component: true });
    expect(decoded.output).toBe("café ☕");
  });
});
