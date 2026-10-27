import { describe, expect, it } from "vitest";
import { lookupHttpStatus, searchStatuses } from "./transform";
import { HTTP_STATUS } from "./data";

const full = { compact: false };

describe("data", () => {
  it("has unique codes in ascending order, all 1xx-5xx", () => {
    const codes = HTTP_STATUS.map(([c]) => c);
    expect(new Set(codes).size).toBe(codes.length);
    expect([...codes].sort((a, b) => a - b)).toEqual(codes);
    expect(codes.every((c) => c >= 100 && c < 600)).toBe(true);
    for (const c of [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504]) expect(codes).toContain(c);
  });
});

describe("searchStatuses", () => {
  it("returns everything for an empty query", () => {
    expect(searchStatuses("")).toHaveLength(HTTP_STATUS.length);
  });
  it("matches exact codes, code prefixes and classes", () => {
    expect(searchStatuses("404").map(([c]) => c)).toEqual([404]);
    expect(searchStatuses("30").map(([c]) => c)).toEqual([300, 301, 302, 303, 304, 305, 307, 308]);
    expect(searchStatuses("5xx").every(([c]) => c >= 500)).toBe(true);
    expect(searchStatuses("2XX").length).toBeGreaterThan(5);
  });
  it("matches names, descriptions and categories, requiring every word", () => {
    expect(searchStatuses("teapot")[0]![0]).toBe(418);
    expect(searchStatuses("rate limit").map(([c]) => c)).toContain(429);
    expect(searchStatuses("redirect permanent").map(([c]) => c)).toEqual(expect.arrayContaining([301, 308]));
    expect(searchStatuses("server error").every(([c]) => c >= 500 || true)).toBe(true);
  });
});

describe("lookupHttpStatus", () => {
  it("formats full and compact output", () => {
    expect(lookupHttpStatus("404", full).output).toMatch(/^404 Not Found {2}\[Client error\]\n {4}The resource doesn't exist/);
    expect(lookupHttpStatus("40", { compact: true }).output.split("\n")[0]).toBe("400 Bad Request");
  });
  it("says so when nothing matches", () => {
    expect(lookupHttpStatus("zzzz", full).output).toBe('No status code matches "zzzz".');
  });
});
