import { describe, expect, it } from "vitest";
import { parseUrl } from "./transform";
import type { UrlParserOptions } from "./schema";

const defaultOptions: UrlParserOptions = { decodeComponents: true };

describe("parseUrl", () => {
  it("parses a full URL with all parts", () => {
    const result = parseUrl(
      "https://user:pass@example.com:8080/path/to/page?a=1&b=two#section",
      defaultOptions,
    );
    expect(result.error).toBeNull();
    expect(result.protocol).toBe("https");
    expect(result.username).toBe("user");
    expect(result.password).toBe("pass");
    expect(result.hostname).toBe("example.com");
    expect(result.port).toBe("8080");
    expect(result.origin).toBe("https://example.com:8080");
    expect(result.pathname).toBe("/path/to/page");
    expect(result.search).toBe("?a=1&b=two");
    expect(result.hash).toBe("section");
  });

  it("extracts query params as an ordered list, preserving duplicate keys", () => {
    const result = parseUrl("https://example.com?tag=a&tag=b&q=hello", defaultOptions);
    expect(result.queryParams).toEqual([
      { key: "tag", value: "a" },
      { key: "tag", value: "b" },
      { key: "q", value: "hello" },
    ]);
  });

  it("decodes percent-escaped path and hash when decodeComponents is true", () => {
    const result = parseUrl("https://example.com/hello%20world#se%20ction", defaultOptions);
    expect(result.pathname).toBe("/hello world");
    expect(result.hash).toBe("se ction");
  });

  it("leaves percent-escapes untouched when decodeComponents is false", () => {
    const result = parseUrl("https://example.com/hello%20world", { decodeComponents: false });
    expect(result.pathname).toBe("/hello%20world");
  });

  it("assumes https:// for a bare host+path with no scheme", () => {
    const result = parseUrl("example.com/path", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.protocol).toBe("https");
    expect(result.hostname).toBe("example.com");
  });

  it("handles a URL with no path, query, or hash", () => {
    const result = parseUrl("https://example.com", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.pathname).toBe("/");
    expect(result.search).toBe("");
    expect(result.hash).toBe("");
    expect(result.queryParams).toEqual([]);
  });

  it("returns empty result for empty input without error", () => {
    const result = parseUrl("   ", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.hostname).toBe("");
  });

  it("returns an error for unparseable input", () => {
    const result = parseUrl("not a url at all!!", defaultOptions);
    expect(result.error).not.toBeNull();
  });

  it("preserves a non-http scheme when explicitly given", () => {
    const result = parseUrl("ftp://files.example.com/archive.zip", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.protocol).toBe("ftp");
  });

  it("handles an IPv6 literal host", () => {
    const result = parseUrl("http://[2001:db8::1]:8080/", defaultOptions);
    expect(result.error).toBeNull();
    expect(result.hostname).toBe("[2001:db8::1]");
    expect(result.port).toBe("8080");
  });
});
