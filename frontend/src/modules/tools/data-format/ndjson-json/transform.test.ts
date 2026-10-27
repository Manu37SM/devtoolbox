import { describe, expect, it } from "vitest";
import { convertNdjson } from "./transform";

const toJson = { mode: "ndjson-to-json", indent: "2" } as const;
const toNd = { mode: "json-to-ndjson", indent: "2" } as const;

describe("convertNdjson", () => {
  it("collects lines into an array, skipping blank lines and CRLF", () => {
    const out = convertNdjson('{"a":1}\r\n\r\n{"a":2}\n', toJson).output;
    expect(JSON.parse(out)).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("supports compact output", () => {
    expect(convertNdjson('1\n"x"', { ...toJson, indent: "0" }).output).toBe('[1,"x"]');
  });

  it("points at the offending line", () => {
    const r = convertNdjson('{"a":1}\n{oops}', toJson);
    expect(r.error?.line).toBe(2);
    expect(r.error?.message).toMatch(/^Line 2:/);
  });

  it("splits an array into one compact value per line", () => {
    expect(convertNdjson('[{"a":1},{"a":[1,2]},"s",null]', toNd).output).toBe('{"a":1}\n{"a":[1,2]}\n"s"\nnull');
  });

  it("requires an array for JSON -> NDJSON", () => {
    expect(convertNdjson('{"a":1}', toNd).error?.message).toMatch(/array/);
    expect(convertNdjson("[", toNd).error?.message).toMatch(/Invalid JSON/);
  });

  it("handles empty input", () => {
    expect(convertNdjson("", toJson)).toEqual({ output: "", error: null });
  });
});
