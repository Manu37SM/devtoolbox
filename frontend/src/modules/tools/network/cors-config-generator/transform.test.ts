import { describe, expect, it } from "vitest";
import { generateCors, parseCors } from "./transform";

const gen = (s: string, target = "spring-mvc" as const) => generateCors(s, { target });
const IN = "origins: https://app.acme.com, https://admin.acme.com\nmethods: get, post\nheaders: Content-Type, Authorization\ncredentials: true\nmaxage: 600";

describe("parseCors", () => {
  it("parses fields", () => {
    expect(parseCors(IN)).toEqual({ origins: ["https://app.acme.com", "https://admin.acme.com"], methods: ["GET", "POST"], headers: ["Content-Type", "Authorization"], expose: [], credentials: true, maxAge: 600 });
  });
  it("rejects wildcard with credentials (browsers block it)", () => {
    expect(parseCors("origins: *\ncredentials: true")).toMatch(/wildcard/);
  });
  it("rejects bad origins", () => {
    expect(parseCors("origins: https://a.com/")).toMatch(/trailing slash/);
    expect(parseCors("")).toMatch(/origins/);
  });
});

describe("generateCors", () => {
  it("spring mvc", () => {
    const o = gen(IN).output;
    expect(o).toContain('.allowedOrigins("https://app.acme.com", "https://admin.acme.com")');
    expect(o).toContain(".allowCredentials(true)");
    expect(o).toContain(".maxAge(600)");
  });
  it("wildcard uses allowedOriginPatterns in spring", () => {
    expect(gen("origins: *").output).toContain('allowedOriginPatterns("*")');
  });
  it("nginx maps origins and sets Vary", () => {
    const o = gen(IN, "nginx" as never).output;
    expect(o).toContain('"https://app.acme.com" "https://app.acme.com";');
    expect(o).toContain("$cors_origin");
    expect(o).toContain('add_header Vary "Origin" always;');
  });
  it("other targets render", () => {
    for (const t of ["spring-security", "apache", "express", "kong", "http-headers"] as const) expect(generateCors(IN, { target: t }).output.length).toBeGreaterThan(30);
    expect(generateCors(IN, { target: "kong" }).output).toContain("max_age: 600");
    expect(generateCors(IN, { target: "express" }).output).toContain("credentials: true");
  });
  it("empty is empty", () => { expect(gen("")).toEqual({ output: "", error: null }); });
});
