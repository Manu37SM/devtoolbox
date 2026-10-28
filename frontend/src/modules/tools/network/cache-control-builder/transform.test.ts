import { describe, expect, it } from "vitest";
import { buildCacheControl, buildDirectives, humanSeconds, parseCacheControl, review } from "./transform";

const base = { visibility: "public", maxAge: 3600, sMaxAge: -1, staleWhileRevalidate: 0, staleIfError: 0, noCache: false, noStore: false, mustRevalidate: false, immutable: false, noTransform: false } as const;

describe("buildDirectives", () => {
  it("builds common recipes", () => {
    expect(buildDirectives(base).join(", ")).toBe("public, max-age=3600");
    expect(buildDirectives({ ...base, maxAge: 31536000, immutable: true }).join(", ")).toBe("public, max-age=31536000, immutable");
    expect(buildDirectives({ ...base, noStore: true, visibility: "private" }).join(", ")).toBe("no-store");
    expect(buildDirectives({ ...base, maxAge: 0, noCache: true, mustRevalidate: true, visibility: "private" }).join(", ")).toBe("private, no-cache, must-revalidate");
    expect(buildDirectives({ ...base, sMaxAge: 600, staleWhileRevalidate: 30 }).join(", ")).toBe("public, max-age=3600, s-maxage=600, stale-while-revalidate=30");
  });
});

describe("parse / review / format", () => {
  it("parses headers case-insensitively with a prefix", () => {
    expect(parseCacheControl("Cache-Control: Public, Max-Age=60")).toEqual([["public", undefined], ["max-age", "60"]]);
  });
  it("warns about contradictions", () => {
    expect(review(parseCacheControl("no-store, max-age=60"))[0]).toContain("no-store");
    expect(review(parseCacheControl("public, private"))[0]).toContain("contradict");
    expect(review(parseCacheControl("immutable, max-age=60"))[0]).toContain("immutable");
    expect(review(parseCacheControl("public, max-age=60"))).toEqual([]);
  });
  it("humanises seconds", () => {
    expect(humanSeconds(90061)).toBe("1 day 1 hour 1 minute 1 second");
    expect(humanSeconds(31536000)).toBe("1 year");
  });
  it("explains a pasted header and a built one", () => {
    const a = buildCacheControl("max-age=300, stale-while-revalidate=60, foo", base);
    expect(a.output).toContain("fresh for 5 minutes");
    expect(a.output).toContain("unrecognised directive");
    expect(a.output).toContain('add_header Cache-Control "max-age=300, stale-while-revalidate=60, foo" always;');
    expect(buildCacheControl("", base).output.startsWith("Cache-Control: public, max-age=3600")).toBe(true);
  });
});
