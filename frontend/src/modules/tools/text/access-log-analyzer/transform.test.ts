import { describe, expect, it } from "vitest";
import { analyzeLog, parseLine } from "./transform";

const L1 = '203.0.113.5 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html?x=1 HTTP/1.1" 200 2326 "https://ref.example/" "Mozilla/5.0"';
const L2 = '203.0.113.5 - bob [10/Oct/2023:13:59:01 +0000] "POST /api/login HTTP/1.1" 401 120 "-" "curl/8.0"';
const L3 = '198.51.100.7 - - [10/Oct/2023:14:01:00 +0000] "GET /index.html HTTP/2.0" 200 - "-" "Mozilla/5.0"';
const o = { topN: 5, ignoreQuery: true };

describe("parseLine", () => {
  it("parses combined format", () => {
    expect(parseLine(L1)).toMatchObject({ ip: "203.0.113.5", method: "GET", path: "/index.html?x=1", status: 200, bytes: 2326, referrer: "https://ref.example/", agent: "Mozilla/5.0", hour: "2023-10-10 13:00" });
  });
  it("handles '-' bytes and common format without referrer/agent", () => {
    expect(parseLine(L3)!.bytes).toBe(0);
    expect(parseLine('1.2.3.4 - - [01/Jan/2024:00:00:00 +0000] "GET / HTTP/1.0" 200 5')).toMatchObject({ agent: "-", referrer: "-" });
  });
  it("handles malformed request lines and non-log text", () => {
    expect(parseLine('1.2.3.4 - - [01/Jan/2024:00:00:00 +0000] "-" 408 0')).toMatchObject({ method: "-", status: 408 });
    expect(parseLine("hello")).toBeNull();
  });
});

describe("analyzeLog", () => {
  it("aggregates", () => {
    const r = analyzeLog([L1, L2, L3, "garbage"].join("\n"), o);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Parsed 3 requests (1 unparseable line, first at line 4)");
    expect(r.output).toContain("Unique IPs: 2");
    expect(r.output).toMatch(/2\s+\/index\.html\n/); // query ignored
    expect(r.output).toMatch(/1\s+401 \/api\/login/);
    expect(r.output).toMatch(/2\s+2xx/);
    expect(r.output).toContain("2023-10-10 13:00");
    expect(r.output).toContain("Error rate (4xx/5xx): 33.3%");
  });
  it("keeps queries when asked", () => {
    expect(analyzeLog(L1, { ...o, ignoreQuery: false }).output).toContain("/index.html?x=1");
  });
  it("errors when nothing parses; empty input is fine", () => {
    expect(analyzeLog("nope", o).error?.message).toMatch(/Common\/Combined/);
    expect(analyzeLog("", o)).toEqual({ output: "", error: null });
  });
});
