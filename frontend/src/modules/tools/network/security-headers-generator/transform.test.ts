import { describe, expect, it } from "vitest";
import { collect, runSecurityHeadersGenerator } from "./transform";
import type { SecurityHeadersGeneratorOptions } from "./schema";

const INPUT = `hsts: max-age=31536000; includeSubDomains; preload
csp: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'
referrer-policy: strict-origin-when-cross-origin
permissions-policy: camera=(), microphone=(), geolocation=()
frame-options: DENY
coop: same-origin
coep:`;
const run = (target: SecurityHeadersGeneratorOptions["target"], input = INPUT) => runSecurityHeadersGenerator(input, { target }).output;

describe("collect", () => {
  it("maps short names, skips empty values and adds nosniff", () => {
    const { headers, warnings } = collect(INPUT);
    expect(headers.map(([n]) => n)).toEqual(["Strict-Transport-Security", "Content-Security-Policy", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "Cross-Origin-Opener-Policy", "X-Content-Type-Options"]);
    expect(warnings).toEqual([]);
  });
  it("lints weak settings", () => {
    const { warnings } = collect("hsts: max-age=300; preload\ncsp: default-src 'self' 'unsafe-inline'\nxss-protection: 1; mode=block");
    expect(warnings).toEqual([
      "HSTS max-age 300s is under 180 days; most scanners expect at least 15552000.",
      "HSTS preload requires includeSubDomains and max-age >= 31536000 (hstspreload.org).",
      "script-src allows 'unsafe-inline' without nonces or hashes, which defeats most of CSP's XSS protection.",
      "Add object-src 'none' to the CSP.",
      "Neither frame-ancestors nor X-Frame-Options is set: the page can be framed (clickjacking).",
      "X-XSS-Protection is deprecated and the 1; mode=block filter caused vulnerabilities; send 0 or omit it.",
      "No Referrer-Policy; strict-origin-when-cross-origin is a safe default.",
    ]);
  });
});

describe("render", () => {
  it("nginx and apache", () => {
    expect(run("nginx")).toContain(`add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'" always;`);
    expect(run("apache")).toContain('Header always set X-Frame-Options "DENY"');
  });
  it("Spring Security uses the typed DSL where it exists", () => {
    const out = run("spring-security");
    expect(out).toContain(".httpStrictTransportSecurity(hsts -> hsts.maxAgeInSeconds(31536000).includeSubDomains(true).preload(true))");
    expect(out).toContain(".frameOptions(frame -> frame.deny())");
    expect(out).toContain(".referrerPolicy(referrer -> referrer.policy(ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))");
    expect(out).toContain('.addHeaderWriter(new StaticHeadersWriter("Permissions-Policy", "camera=(), microphone=(), geolocation=()"))');
    expect(out).not.toContain('StaticHeadersWriter("X-Content-Type-Options"');
  });
  it("gateways: Kong and Apigee", () => {
    expect(run("kong")).toContain('          - "X-Frame-Options:DENY"');
    expect(run("apigee")).toContain(`<Header name="Content-Security-Policy">default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'</Header>`);
    expect(run("apigee")).toContain('<AssignTo createNew="false" transport="http" type="response"/>');
  });
  it("hosting platforms", () => {
    expect(JSON.parse(run("vercel")).headers[0].headers[0]).toEqual({ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" });
    expect(run("netlify")).toContain("/*\n  Strict-Transport-Security: max-age=31536000");
    expect(run("iis")).toContain('<add name="X-Frame-Options" value="DENY" />');
    expect(run("caddy")).toContain('  X-Content-Type-Options "nosniff"');
    expect(run("express")).toContain('res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");');
  });
});
