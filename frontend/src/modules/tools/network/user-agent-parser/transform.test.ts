import { describe, expect, it } from "vitest";
import { parseUserAgent, parseUserAgentStructured } from "./transform";

const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36";
const FIREFOX_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/119.0";
const SAFARI_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36";
const GOOGLEBOT = "Googlebot/2.1 (+http://www.google.com/bot.html)";

describe("parseUserAgent", () => {
  it("errors on empty input", () => {
    const result = parseUserAgent("");
    expect(result.error).not.toBeNull();
    expect(result.output).toBe("");
  });

  it("errors on whitespace-only input", () => {
    const result = parseUserAgent("   ");
    expect(result.error).not.toBeNull();
  });

  it("parses a Chrome on Windows UA into JSON output", () => {
    const result = parseUserAgent(CHROME_WINDOWS);
    expect(result.error).toBeNull();
    const parsed = JSON.parse(result.output);
    expect(parsed.browser.name).toBe("Chrome");
    expect(parsed.os.name).toBe("Windows");
  });

  it("parses a Firefox on Mac UA", () => {
    const result = parseUserAgent(FIREFOX_MAC);
    const parsed = JSON.parse(result.output);
    expect(parsed.browser.name).toBe("Firefox");
    expect(parsed.os.name).toMatch(/mac/i);
  });

  it("parses a mobile Safari UA and detects device type", () => {
    const result = parseUserAgent(SAFARI_IPHONE);
    const parsed = JSON.parse(result.output);
    expect(parsed.os.name).toBe("iOS");
    expect(parsed.device.type).toBe("mobile");
  });

  it("parses an Android Chrome UA", () => {
    const result = parseUserAgent(ANDROID_CHROME);
    const parsed = JSON.parse(result.output);
    expect(parsed.os.name).toBe("Android");
  });

  it("does not throw on a bot/non-standard UA string", () => {
    const result = parseUserAgent(GOOGLEBOT);
    expect(result.error).toBeNull();
    expect(() => JSON.parse(result.output)).not.toThrow();
  });

  it("does not throw on garbage input", () => {
    const result = parseUserAgent("not a real user agent at all !!!! ####");
    expect(result.error).toBeNull();
  });
});

describe("parseUserAgentStructured", () => {
  it("returns the raw ua string alongside parsed sections", () => {
    const result = parseUserAgentStructured(CHROME_WINDOWS);
    expect(result.ua).toBe(CHROME_WINDOWS);
    expect(result.browser.name).toBe("Chrome");
    expect(result.engine.name).toBeTruthy();
  });

  it("includes cpu architecture info when derivable", () => {
    const result = parseUserAgentStructured(CHROME_WINDOWS);
    expect(result.cpu).toBeDefined();
  });
});
