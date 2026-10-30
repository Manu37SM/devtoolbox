import { describe, expect, it } from "vitest";
import { decodeMappings, decodeVlq, parseSourceMap, resolveSourceMap } from "./transform";

// Built by esbuild --minify from a small TypeScript file; the expected positions below
// come from @jridgewell/trace-mapping (the reference implementation).
const MAP = "{\"version\": 3, \"sources\": [\"src.ts\"], \"sourcesContent\": [\"export function greet(name: string): string {\\n  const message = \\\"Hello, \\\" + name;\\n  return message.toUpperCase();\\n}\\n\\nexport function fail(reason: string) {\\n  throw new Error(\\\"failed: \\\" + reason);\\n}\\n\"], \"mappings\": \"AAAO,SAASA,EAAMC,EAAsB,CAE1C,OADgB,UAAYA,GACb,YAAY,CAC7B,CAEO,SAASC,EAAKC,EAAgB,CACnC,MAAM,IAAI,MAAM,WAAaA,CAAM,CACrC\", \"names\": [\"greet\", \"name\", \"fail\", \"reason\"]}";

type Exp = [number, "before" | "after", number | null, number | null, string | null];
const ORACLE: Exp[] = [
  [0, "before", 1, 7, null], [0, "after", 1, 7, null],
  [9, "before", 1, 16, "greet"], [10, "before", 1, 16, "greet"], [10, "after", 1, 22, "name"],
  [12, "before", 1, 22, "name"], [12, "after", 1, 44, null],
  [20, "before", 3, 2, null], [20, "after", 2, 18, null],
  [30, "before", 2, 18, null], [30, "after", 2, 30, "name"],
  [45, "before", 3, 17, null], [45, "after", 3, 29, null],
  [60, "before", 6, 21, "reason"], [60, "after", 6, 37, null],
  [70, "before", 7, 8, null], [70, "after", 7, 12, null],
  [80, "before", 7, 18, null], [80, "after", 7, 31, "reason"],
  [95, "before", 8, 0, null], [95, "after", null, null, null],
  [110, "before", 8, 0, null],
];

describe("source map decoding", () => {
  it("decodes base64 VLQ values", () => {
    expect(decodeVlq("AAAA")).toEqual([0, 0, 0, 0]);
    expect(decodeVlq("D")).toEqual([-1]);
    expect(decodeVlq("2H")).toEqual([123]);
    expect(decodeVlq("F")).toEqual([-2]);
    expect(decodeVlq("gB")).toEqual([16]);
        expect(() => decodeVlq("g")).toThrow(/Truncated/);
    expect(() => decodeVlq("!")).toThrow(/Invalid/);
  });
  it("decodes the mappings into per-line segments", () => {
    const lines = decodeMappings("AAAA,CAAC;AACD");
    expect(lines[0]).toEqual([[0, 0, 0, 0, -1], [1, 0, 0, 1, -1]]);
    expect(lines[1]).toEqual([[0, 0, 1, 0, -1]]);
  });
  it("matches the reference implementation for every probed position", () => {
    const map = parseSourceMap(MAP);
    for (const [col, bias, line, column, name] of ORACLE) {
      const hit = map.find(1, col, bias);
      if (line === null) expect(hit, `col ${col} ${bias}`).toBeNull();
      else expect(hit, `col ${col} ${bias}`).toEqual({ source: "src.ts", line, column, name });
    }
  });
});

describe("resolveSourceMap", () => {
  it("rewrites stack-trace frames and prints source context", () => {
    const r = resolveSourceMap(MAP, "    at n (https://cdn.example.com/out.js:1:63)\nError: boom", {});
    const lines = r.output.split("\n");
    expect(lines[0]).toBe("    at n (src.ts:7:3)");
    expect(r.output).toContain("> ");
    expect(r.output).toContain('throw new Error("failed: " + reason);');
    expect(r.output).toContain("Error: boom");
  });
  it("accepts bare positions, 0-based columns and the 'after' bias", () => {
    const base = resolveSourceMap(MAP, "1:10", { context: 0, columnBase: "0", bias: "after" });
    expect(base.output).toBe("src.ts:1:22  [name]");
    expect(resolveSourceMap(MAP, "1 10", { context: 0, columnBase: "1" }).output).toBe("src.ts:1:17  [greet]");
  });
  it("says when nothing maps and strips path prefixes", () => {
    expect(resolveSourceMap(MAP, "1:96", { columnBase: "1", bias: "after", context: 0 }).output).toContain("no mapping");
    expect(resolveSourceMap(MAP, "1:10", { stripPrefix: "src", context: 0 }).output).toMatch(/^\.ts:1:/);
  });
  it("lists sources and mappings", () => {
    expect(resolveSourceMap(MAP, "", { mode: "sources" }).output).toContain("0  src.ts");
    expect(resolveSourceMap(MAP, "", { mode: "mappings", columnBase: "0" }).output.split("\n")[0]).toBe("1:0 → src.ts:1:7");
  });
  it("rejects things that are not source maps", () => {
    expect(resolveSourceMap("{bad", "1:1", {}).error?.message).toMatch(/not valid JSON/);
    expect(resolveSourceMap("{}", "1:1", {}).error?.message).toMatch(/does not look like/);
    expect(resolveSourceMap('{"version":3,"sections":[]}', "1:1", {}).error?.message).toMatch(/sections/);
    expect(resolveSourceMap('{"version":2,"sources":[],"mappings":""}', "1:1", {}).error?.message).toMatch(/version 2/);
    expect(resolveSourceMap("", "1:1", {})).toEqual({ output: "", error: null });
  });
});
