import { describe, expect, it } from "vitest";
import { fmtBytes, fmtMs, parseHar, viewHar } from "./transform";

const har = (entries: unknown[]) => JSON.stringify({ log: { version: "1.2", creator: { name: "WebInspector", version: "537.36" }, pages: [{}], entries } });
const entry = (url: string, status: number, time: number, bodySize: number, mime = "text/html; charset=utf-8", method = "GET") => ({
  startedDateTime: "2024-01-01T00:00:00.000Z", time,
  request: { method, url },
  response: { status, statusText: "", headersSize: 100, bodySize, content: { size: bodySize, mimeType: mime } },
});
const o = { sortBy: "order" as const, onlyErrors: false, maxRows: 200 };

describe("parseHar", () => {
  it("extracts rows", () => {
    const { rows, creator, pages } = parseHar(har([entry("https://e.com/", 200, 120, 900)]));
    expect(rows[0]).toMatchObject({ method: "GET", status: 200, url: "https://e.com/", mime: "text/html", size: 1000, time: 120 });
    expect(creator).toBe("WebInspector 537.36");
    expect(pages).toBe(1);
  });
  it("falls back to content size when bodySize is -1", () => {
    const e = entry("https://e.com/a", 304, 5, -1);
    (e.response.content as { size: number }).size = 777;
    expect(parseHar(har([e])).rows[0]!.size).toBe(777);
  });
  it("rejects non-HAR input", () => {
    expect(() => parseHar("{}")).toThrow(/Not a HAR/);
    expect(() => parseHar("nope")).toThrow(/Invalid JSON/);
  });
});

describe("formatting", () => {
  it("formats bytes and durations", () => {
    expect(fmtBytes(512)).toBe("512 B");
    expect(fmtBytes(2048)).toBe("2.0 KB");
    expect(fmtBytes(3 * 1048576)).toBe("3.00 MB");
    expect(fmtMs(250)).toBe("250 ms");
    expect(fmtMs(1500)).toBe("1.50 s");
  });
});

describe("viewHar", () => {
  const data = har([entry("https://e.com/", 200, 100, 900), entry("https://e.com/slow.js", 200, 2500, 50000, "application/javascript"), entry("https://e.com/missing", 404, 30, 0)]);
  it("summarizes and counts failures", () => {
    const r = viewHar(data, o);
    expect(r.output).toContain("Requests: 3   Failed (4xx/5xx/0): 1");
    expect(r.output).toContain("application/javascript");
  });
  it("sorts by time and filters errors", () => {
    const lines = viewHar(data, { ...o, sortBy: "time" }).output.split("\n");
    const first = lines.findIndex((l) => l.includes("https://e.com/slow.js"));
    expect(first).toBeGreaterThan(lines.findIndex((l) => l.includes("Method")));
    expect(lines[lines.findIndex((l) => l.includes("Method")) + 1]).toContain("slow.js");
    const errs = viewHar(data, { ...o, onlyErrors: true }).output;
    expect(errs).toContain("/missing");
    expect(errs).not.toContain("slow.js");
  });
  it("truncates to maxRows and reports errors", () => {
    expect(viewHar(data, { ...o, maxRows: 1 }).output).toContain("showing 1 of 3");
    expect(viewHar("[]", o).error?.message).toMatch(/Not a HAR/);
    expect(viewHar("", o)).toEqual({ output: "", error: null });
  });
});
