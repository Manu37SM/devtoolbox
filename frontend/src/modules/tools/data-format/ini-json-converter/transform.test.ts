import { describe, expect, it } from "vitest";
import { parseIni, runIniJson, stringifyIni } from "./transform";

const sample = `; comment
name = demo
debug = true
[server]
host: localhost
port = 8080   ; inline comment
tags = a
tags = b
[server.tls]
enabled = off
path = "C:\\\\certs"
`;

describe("parseIni", () => {
  it("parses globals, sections, comments and type inference", () => {
    expect(parseIni(sample, true, false)).toEqual({
      name: "demo", debug: true,
      server: { host: "localhost", port: 8080, tags: ["a", "b"] },
      "server.tls": { enabled: false, path: "C:\\certs" },
    });
  });
  it("can nest dotted sections", () => {
    expect((parseIni(sample, true, true).server as Record<string, unknown>).tls).toEqual({ enabled: false, path: "C:\\certs" });
  });
  it("keeps strings when inference is off", () => {
    expect(parseIni("a = 1\nb = true", false, false)).toEqual({ a: "1", b: "true" });
  });
  it("supports key[] arrays and quoted values that look like numbers", () => {
    expect(parseIni('x[] = 1\nx[] = 2\nzip = "01234"', true, false)).toEqual({ x: [1, 2], zip: "01234" });
  });
  it("rejects junk and unsafe keys with line numbers", () => {
    expect(() => parseIni("a=1\njunk", true, false)).toThrowError(/Cannot parse/);
    expect(() => parseIni("[__proto__]\na=1", true, false)).toThrowError(/unsafe/);
    expect(({} as Record<string, unknown>).a).toBeUndefined();
  });
});

describe("stringifyIni", () => {
  it("writes globals first, then sections, and round-trips", () => {
    const obj = parseIni(sample, true, true);
    const ini = stringifyIni(obj);
    expect(ini.startsWith("name = demo\ndebug = true\n")).toBe(true);
    expect(ini).toContain("[server.tls]");
    expect(parseIni(ini, true, true)).toEqual(obj);
  });
  it("quotes strings that would be re-typed", () => {
    expect(stringifyIni({ a: "true", b: "12", c: "x;y" })).toBe('a = "true"\nb = "12"\nc = "x;y"\n');
  });
  it("refuses arrays of objects", () => {
    expect(() => stringifyIni({ a: [{ b: 1 }] })).toThrow(/INI cannot/);
  });
});

describe("runIniJson", () => {
  const o = { direction: "ini-to-json" as const, inferTypes: true, nestDotted: false, indent: "min" as const };
  it("converts both ways and reports errors", () => {
    expect(runIniJson("a=1", o).output).toBe('{"a":1}');
    expect(runIniJson('{"a":{"b":true}}', { ...o, direction: "json-to-ini" }).output).toBe("[a]\nb = true\n");
    expect(runIniJson("bad line", o).error?.line).toBe(1);
    expect(runIniJson("[1]", { ...o, direction: "json-to-ini" }).error?.message).toMatch(/object/);
  });
});
