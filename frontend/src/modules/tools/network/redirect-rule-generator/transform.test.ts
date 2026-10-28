import { describe, expect, it } from "vitest";
import { generateRedirects, parseRules } from "./transform";

const input = "/old /new\n/blog https://blog.example.com/ 302 # moved\n/a /b 307";
const o = { target: "nginx" as const, defaultCode: "301" as const };

describe("parseRules", () => {
  it("applies the default code and strips comments", () => {
    expect(parseRules(input, 301)).toEqual([
      { from: "/old", to: "/new", code: 301 },
      { from: "/blog", to: "https://blog.example.com/", code: 302 },
      { from: "/a", to: "/b", code: 307 },
    ]);
  });
  it("validates every line with a line number", () => {
    expect(() => parseRules("old /new", 301)).toThrow(/start with/);
    expect(() => parseRules("/a", 301)).toThrow(/Expected/);
    expect(() => parseRules("/a /b 200", 301)).toThrow(/not a redirect/);
    expect(() => parseRules("/a /b\n/a /c", 301)).toThrow(/Duplicate/);
    expect(() => parseRules("/a /a", 301)).toThrow(/loop/);
    expect(() => parseRules("/a /b;}", 301)).toThrow(/Unsupported/);
    expect(() => parseRules("/a b", 301)).toThrow(/Destination/);
    try { parseRules("/a /b\n/c", 301); } catch (e) { expect((e as { line: number }).line).toBe(2); }
  });
});

describe("generateRedirects", () => {
  it("renders nginx, apache, netlify, caddy, cloudflare", () => {
    expect(generateRedirects(input, o).output.split("\n")[0]).toBe("location = /old { return 301 /new; }");
    expect(generateRedirects(input, { ...o, target: "apache" }).output).toContain("Redirect 302 /blog https://blog.example.com/");
    expect(generateRedirects(input, { ...o, target: "netlify" }).output).toContain("/old  /new  301");
    expect(generateRedirects(input, { ...o, target: "caddy" }).output).toContain("redir /a /b 307");
    expect(generateRedirects(input, { ...o, target: "cloudflare" }).output).toContain("/old,/new,301");
  });
  it("renders valid vercel JSON with permanent / statusCode", () => {
    const j = JSON.parse(generateRedirects(input, { ...o, target: "vercel" }).output);
    expect(j.redirects[0]).toEqual({ source: "/old", destination: "/new", permanent: true });
    expect(j.redirects[1]).toEqual({ source: "/blog", destination: "https://blog.example.com/", permanent: false });
    expect(j.redirects[2]).toEqual({ source: "/a", destination: "/b", statusCode: 307 });
  });
  it("flags redirect chains", () => {
    expect(generateRedirects("/a /b\n/b /c", o).output).toContain("Chain: /a → /b → /c");
  });
  it("returns errors with line numbers", () => {
    expect(generateRedirects("x y", o).error).toMatchObject({ line: 1 });
    expect(generateRedirects("", o)).toEqual({ output: "", error: null });
  });
});
