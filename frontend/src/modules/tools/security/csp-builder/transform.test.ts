import { describe, expect, it } from "vitest";
import { analyze, buildCsp, buildPolicy, parseExtras } from "./transform";

const base = { defaultSrc: "self", inlineStyles: false, inlineScripts: false, evalScripts: false, blockObjects: true, upgradeInsecure: true, frameAncestors: "none", baseUri: true, formAction: true, allowData: true, reportOnly: false } as const;
const policyString = (p: Map<string, string[]>) => [...p].map(([d, s]) => (s.length ? `${d} ${s.join(" ")}` : d)).join("; ");

describe("buildPolicy", () => {
  it("produces a strict baseline", () => {
    expect(policyString(buildPolicy(base, new Map()))).toBe(
      "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
    );
  });
  it("adds extra hosts and keeps default-src inheritance when a directive is specialised", () => {
    const { map } = parseExtras("script-src https://cdn.example.com\nconnect-src https://api.example.com wss://ws.example.com");
    const s = policyString(buildPolicy(base, map));
    expect(s).toContain("script-src 'self' https://cdn.example.com");
    expect(s).toContain("connect-src 'self' https://api.example.com wss://ws.example.com");
  });
  it("supports default-src 'none' with explicit allowances", () => {
    const s = policyString(buildPolicy({ ...base, defaultSrc: "none" }, new Map()));
    expect(s.startsWith("default-src 'none'; script-src 'self'; style-src 'self'")).toBe(true);
  });
  it("applies unsafe toggles", () => {
    const s = policyString(buildPolicy({ ...base, inlineScripts: true, evalScripts: true, inlineStyles: true }, new Map()));
    expect(s).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(s).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe("parseExtras / analyze", () => {
  it("validates directives and sources", () => {
    expect(parseExtras("scrpt-src https://a.com").problems[0]).toContain("Unknown directive");
    expect(parseExtras("script-src https://a.com 'nonce-abc123' 'self'").problems).toEqual([]);
    expect(parseExtras("script-src not valid!").problems.length).toBeGreaterThan(0);
  });
  it("flags weaknesses", () => {
    const w = analyze(new Map([["script-src", ["'self'", "'unsafe-inline'", "*"]], ["img-src", ["data:", "http:"]]]));
    expect(w.some((x) => x.includes("unsafe-inline"))).toBe(true);
    expect(w.some((x) => x.includes("wildcard"))).toBe(true);
    expect(w.some((x) => x.includes("http:"))).toBe(true);
    expect(w.some((x) => x.includes("base-uri"))).toBe(true);
    expect(analyze(buildPolicy(base, new Map()))).toEqual([]);
  });
});

describe("buildCsp", () => {
  it("renders header and meta without header-only directives", () => {
    const r = buildCsp("", base);
    expect(r.error).toBeNull();
    expect(r.output.startsWith("Content-Security-Policy: default-src 'self'")).toBe(true);
    const meta = r.output.split("\n").find((l) => l.startsWith("<meta http-equiv"))!;
    expect(meta).not.toContain("frame-ancestors");
    expect(buildCsp("", { ...base, reportOnly: true }).output).toContain("Content-Security-Policy-Report-Only:");
  });
  it("surfaces input errors", () => {
    expect(buildCsp("bogus-src x", base).error?.message).toContain("Unknown directive");
  });
});
