import { describe, expect, it } from "vitest";
import { analyze, analyzeHeaders, parseHeaders } from "./transform";

const good = `HTTP/2 200
strict-transport-security: max-age=31536000; includeSubDomains
content-security-policy: default-src 'self'; frame-ancestors 'none'
x-content-type-options: nosniff
referrer-policy: no-referrer
permissions-policy: camera=()
cache-control: no-store`;

describe("parseHeaders", () => {
  it("splits status, names and values (value may contain colons)", () => {
    const r = parseHeaders("HTTP/1.1 301 Moved\nLocation: https://x.test:8443/a\nX-A:  b ");
    expect(r.status).toBe("HTTP/1.1 301 Moved");
    expect(r.headers).toEqual([["Location", "https://x.test:8443/a"], ["X-A", "b"]]);
  });
  it("joins folded continuation lines", () => {
    expect(parseHeaders("X-Long: a\n  b").headers).toEqual([["X-Long", "a b"]]);
  });
});

describe("analyze", () => {
  it("passes a well configured response", () => {
    const f = analyze(parseHeaders(good).headers);
    expect(f.filter((x) => x.level !== "ok")).toEqual([]);
  });
  it("flags missing core headers as failures", () => {
    const f = analyze([]).filter((x) => x.level === "fail").map((x) => x.text);
    expect(f.some((t) => t.startsWith("Strict-Transport-Security"))).toBe(true);
    expect(f.some((t) => t.startsWith("Content-Security-Policy"))).toBe(true);
    expect(f.some((t) => t.startsWith("X-Content-Type-Options"))).toBe(true);
    expect(f.some((t) => t.includes("clickjacking"))).toBe(true);
  });
  it("catches weak HSTS, unsafe CSP and version disclosure", () => {
    const f = analyze(parseHeaders("strict-transport-security: max-age=300\ncontent-security-policy: script-src 'unsafe-inline'\nserver: nginx/1.18.0\nx-powered-by: Express").headers).map((x) => x.text).join("\n");
    expect(f).toContain("max-age is 300s");
    expect(f).toContain("'unsafe-inline'");
    expect(f).toContain('"nginx/1.18.0"');
    expect(f).toContain("X-Powered-By");
  });
  it("reviews CORS and every Set-Cookie separately", () => {
    const f = analyze(parseHeaders("access-control-allow-origin: *\naccess-control-allow-credentials: true\nset-cookie: sid=1; Path=/\nset-cookie: pref=2; Secure; HttpOnly; SameSite=Lax").headers).map((x) => x.text).join("\n");
    expect(f).toContain("wildcard origin with credentials");
    expect(f).toContain('Cookie "sid" is missing Secure, HttpOnly, SameSite');
    expect(f).not.toContain('Cookie "pref"');
  });
});

describe("analyzeHeaders", () => {
  it("lists failures first and can skip the review", () => {
    const out = analyzeHeaders("x-content-type-options: nosniff", { security: true }).output;
    expect(out.indexOf("✗")).toBeLessThan(out.indexOf("✓"));
    expect(analyzeHeaders("A: b", { security: false }).output).not.toContain("Security review");
  });
  it("errors when nothing parses", () => {
    expect(analyzeHeaders("just words", { security: true }).error).not.toBeNull();
    expect(analyzeHeaders("  ", { security: true })).toEqual({ output: "", error: null });
  });
});
