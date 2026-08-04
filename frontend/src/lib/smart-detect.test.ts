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

  it("detects CIDR notation", () => {
    expect(detectToolForContent("192.168.1.0/24")?.toolSlug).toBe("cidr-subnet-calculator");
  });

  it("detects a URL", () => {
    expect(detectToolForContent("https://example.com/path?a=1")?.toolSlug).toBe("url-parser");
    expect(detectToolForContent("http://example.com")?.toolSlug).toBe("url-parser");
  });

  it("detects a cron expression", () => {
    expect(detectToolForContent("*/5 * * * *")?.toolSlug).toBe("cron-builder");
    expect(detectToolForContent("0 9 * * 1-5")?.toolSlug).toBe("cron-builder");
  });

  it("detects a SQL statement", () => {
    expect(detectToolForContent("SELECT * FROM users WHERE id = 1")?.toolSlug).toBe("sql-formatter");
    expect(detectToolForContent("insert into t (a) values (1)")?.toolSlug).toBe("sql-formatter");
  });

  it("detects a User-Agent string", () => {
    expect(
      detectToolForContent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      )?.toolSlug,
    ).toBe("user-agent-parser");
  });

  it("detects .env file content", () => {
    expect(detectToolForContent("NODE_ENV=production\nPORT=4000")?.toolSlug).toBe("dotenv-formatter");
  });

  it("detects XML", () => {
    expect(detectToolForContent('<?xml version="1.0"?><root><a>1</a></root>')?.toolSlug).toBe("xml-formatter");
    expect(detectToolForContent("<root><a>1</a></root>")?.toolSlug).toBe("xml-formatter");
  });

  it("detects YAML", () => {
    expect(detectToolForContent("name: test\nversion: 1.0\nitems:\n  - a\n  - b")?.toolSlug).toBe("yaml-formatter");
  });

  it("detects CSV/TSV data", () => {
    expect(detectToolForContent("a,b,c\n1,2,3\n4,5,6")?.toolSlug).toBe("csv-tsv");
    expect(detectToolForContent("a\tb\tc\n1\t2\t3")?.toolSlug).toBe("csv-tsv");
  });

  it("detects a hash digest by length", () => {
    // MD5("hello") — 32 hex chars
    expect(detectToolForContent("5d41402abc4b2a76b9719d911017c592")?.toolSlug).toBe("hash-generator");
    // SHA-1("hello") — 40 hex chars
    expect(detectToolForContent("aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d")?.toolSlug).toBe("hash-generator");
  });

  it("detects generic hex-encoded data", () => {
    expect(detectToolForContent("deadbeef")?.toolSlug).toBe("hex-text");
  });

  it("returns null for plain unrecognized text", () => {
    expect(detectToolForContent("just some regular sentence here")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(detectToolForContent("")).toBeNull();
    expect(detectToolForContent("   ")).toBeNull();
  });
});
