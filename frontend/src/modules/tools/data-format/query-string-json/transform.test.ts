import { describe, expect, it } from "vitest";
import { convertQueryStringJson, jsonToQueryString, queryStringToJson } from "./transform";

// JSON round-trip so assertions don't depend on null-prototype containers.
const parse = (qs: string, opts = {}) =>
  JSON.parse(JSON.stringify(queryStringToJson(qs, { nested: true, parseValues: false, ...opts })));

describe("queryStringToJson", () => {
  it("parses flat pairs and decodes percent-encoding and +", () => {
    expect(parse("a=1&b=hello%20world&c=x+y")).toEqual({ a: "1", b: "hello world", c: "x y" });
  });

  it("accepts a full URL, a leading ?, and drops the fragment", () => {
    expect(parse("https://example.com/p?x=1&y=2#frag")).toEqual({ x: "1", y: "2" });
    expect(parse("?x=1")).toEqual({ x: "1" });
    expect(parse("https://example.com/path")).toEqual({});
  });

  it("collects repeated keys into arrays", () => {
    expect(parse("t=a&t=b&t=c")).toEqual({ t: ["a", "b", "c"] });
  });

  it("handles empty values and valueless keys", () => {
    expect(parse("a=&b")).toEqual({ a: "", b: "" });
  });

  it("builds nested objects and arrays from bracket notation", () => {
    expect(parse("user[name]=Ann&user[tags][]=x&user[tags][]=y&ids[]=1")).toEqual({
      user: { name: "Ann", tags: ["x", "y"] },
      ids: ["1"],
    });
  });

  it("keeps bracket keys literal when nesting is off", () => {
    expect(parse("a[b]=1", { nested: false })).toEqual({ "a[b]": "1" });
  });

  it("falls back to a literal key on structural conflicts instead of losing data", () => {
    expect(parse("a=1&a[b]=2")).toEqual({ a: "1", "a[b]": "2" });
    expect(parse("a[][b]=1")).toEqual({ "a[][b]": "1" });
  });

  it("coerces values only when asked", () => {
    expect(parse("n=5&f=1.5&t=true&z=null&s=007&big=12345678901234567890", { parseValues: true })).toEqual({
      n: 5, f: 1.5, t: true, z: null, s: "007", big: "12345678901234567890",
    });
  });

  it("is safe against prototype pollution keys", () => {
    parse("__proto__[polluted]=yes&constructor[prototype][x]=1");
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});

describe("jsonToQueryString", () => {
  it("serialises scalars with encoding", () => {
    expect(jsonToQueryString('{"q":"a b&c","n":2,"t":true,"z":null}', "repeat")).toBe("q=a%20b%26c&n=2&t=true&z=");
  });

  it("serialises arrays in both styles", () => {
    expect(jsonToQueryString('{"t":["a","b"]}', "repeat")).toBe("t=a&t=b");
    expect(jsonToQueryString('{"t":["a","b"]}', "brackets")).toBe("t[]=a&t[]=b");
  });

  it("flattens nested objects with bracket keys", () => {
    expect(jsonToQueryString('{"user":{"name":"Ann","tags":["x"]}}', "brackets")).toBe("user[name]=Ann&user[tags][]=x");
  });

  it("rejects non-object roots", () => {
    expect(() => jsonToQueryString("[1,2]", "repeat")).toThrow(/object/);
    expect(() => jsonToQueryString('"x"', "repeat")).toThrow();
  });
});

describe("convertQueryStringJson", () => {
  const base = { mode: "qs-to-json", nested: true, parseValues: false, arrayStyle: "repeat" } as const;

  it("pretty-prints JSON output", () => {
    expect(convertQueryStringJson("a=1", base).output).toBe('{\n  "a": "1"\n}');
  });

  it("round-trips nested data through both directions", () => {
    const json = convertQueryStringJson("u[n]=Ann&t[]=1&t[]=2", base).output;
    expect(convertQueryStringJson(json, { ...base, mode: "json-to-qs", arrayStyle: "brackets" }).output).toBe("u[n]=Ann&t[]=1&t[]=2");
  });

  it("reports invalid JSON as an error", () => {
    expect(convertQueryStringJson("{oops", { ...base, mode: "json-to-qs" }).error?.message).toMatch(/Invalid JSON/);
  });

  it("returns empty output for blank input", () => {
    expect(convertQueryStringJson("", base)).toEqual({ output: "", error: null });
  });
});
