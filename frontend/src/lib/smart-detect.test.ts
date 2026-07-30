import { describe, expect, it } from "vitest";
import { detectToolForContent } from "./smart-detect";

describe("detectToolForContent", () => {
  it("detects a JWT", () => {
    const result = detectToolForContent(
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ",
    );
    expect(result?.toolSlug).toBe("jwt-decoder");
  });

  it("detects a hex color", () => {
    expect(detectToolForContent("#ff0000")?.toolSlug).toBe("color-converter");
    expect(detectToolForContent("1a2b3c")?.toolSlug).toBe("color-converter");
  });

  it("detects a UUID", () => {
    expect(detectToolForContent("110ec58a-a0f2-4ac4-8393-c866d813b8d1")?.toolSlug).toBe("uuid-generator");
  });

  it("detects a Unix timestamp", () => {
    expect(detectToolForContent("1735689600")?.toolSlug).toBe("unix-timestamp");
  });

  it("detects JSON", () => {
    expect(detectToolForContent('{"a":1}')?.toolSlug).toBe("json-formatter");
    expect(detectToolForContent("[1,2,3]")?.toolSlug).toBe("json-formatter");
  });

  it("detects Base64", () => {
    expect(detectToolForContent("aGVsbG8gd29ybGQh")?.toolSlug).toBe("base64");
  });

  it("returns null for plain unrecognized text", () => {
    expect(detectToolForContent("just some regular sentence here")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(detectToolForContent("")).toBeNull();
    expect(detectToolForContent("   ")).toBeNull();
  });
});
