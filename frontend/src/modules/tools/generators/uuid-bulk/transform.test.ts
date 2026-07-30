import { describe, expect, it } from "vitest";
import { generateUuidBulk } from "./transform";

describe("generateUuidBulk", () => {
  it("generates the requested count as newline-separated by default", () => {
    const output = generateUuidBulk({ version: "v4", count: 50, format: "newline" });
    const lines = output.split("\n");
    expect(lines).toHaveLength(50);
    expect(new Set(lines).size).toBe(50);
  });

  it("formats as a JSON array", () => {
    const output = generateUuidBulk({ version: "v4", count: 3, format: "json-array" });
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(3);
  });

  it("formats as CSV with an 'id' header", () => {
    const output = generateUuidBulk({ version: "v4", count: 3, format: "csv" });
    const lines = output.split("\n");
    expect(lines[0]).toBe("id");
    expect(lines).toHaveLength(4);
  });

  it("supports v7", () => {
    const output = generateUuidBulk({ version: "v7", count: 5, format: "newline" });
    for (const line of output.split("\n")) {
      expect(line).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    }
  });

  it("supports the maximum bulk count", () => {
    const output = generateUuidBulk({ version: "v4", count: 10_000, format: "newline" });
    expect(output.split("\n")).toHaveLength(10_000);
  });
});
