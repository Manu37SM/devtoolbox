import { describe, expect, it } from "vitest";
import { buildDmarc, buildSpf, runSpfDmarc } from "./transform";

describe("buildSpf", () => {
  it("assembles a record and counts lookups", () => {
    const r = buildSpf(["include:_spf.google.com", "ip4:203.0.113.0/24", "mx"], "~all");
    expect(r.record).toBe("v=spf1 include:_spf.google.com ip4:203.0.113.0/24 mx ~all");
    expect(r.lookups).toBe(2);
    expect(r.warnings).toEqual([]);
  });
  it("accepts several terms per line and strips a leading v=spf1", () => {
    expect(buildSpf(["v=spf1 a mx ip6:2001:db8::/32"], "-all").record).toBe("v=spf1 a mx ip6:2001:db8::/32 -all");
  });
  it("warns above 10 lookups, on ptr, +all and long records", () => {
    const many = Array.from({ length: 11 }, (_, i) => `include:s${i}.example.com`);
    expect(buildSpf(many, "-all").warnings.join(" ")).toMatch(/exceed the SPF limit/);
    expect(buildSpf(["ptr"], "-all").warnings.join(" ")).toMatch(/deprecated/);
    expect(buildSpf(["a"], "+all").warnings.join(" ")).toMatch(/defeats SPF/);
    const long = Array.from({ length: 20 }, (_, i) => `ip4:10.0.${i}.0/24`);
    expect(buildSpf(long, "-all").warnings.join(" ")).toMatch(/255/);
  });
  it("keeps redirect last and drops the all mechanism", () => {
    expect(buildSpf(["redirect=_spf.example.com", "ip4:1.2.3.4"], "-all").record).toBe("v=spf1 ip4:1.2.3.4 redirect=_spf.example.com");
  });
  it("rejects bad terms", () => {
    expect(() => buildSpf(["ip4:999"], "-all")).toThrow(/ip4/);
    expect(() => buildSpf(["include:"], "-all")).toThrow();
    expect(() => buildSpf(["bogus:x"], "-all")).toThrow(/Unknown/);
    expect(() => buildSpf(["include:notadomain"], "-all")).toThrow(/domain/);
  });
});

describe("buildDmarc", () => {
  it("builds a record with report addresses", () => {
    const r = buildDmarc(["rua=mailto:d@example.com", "adkim=s"], "quarantine", 50);
    expect(r.record).toBe("v=DMARC1; p=quarantine; pct=50; rua=mailto:d@example.com; adkim=s");
    expect(r.warnings).toEqual([]);
  });
  it("warns without rua and on p=none", () => {
    const w = buildDmarc([], "none", 100).warnings.join(" ");
    expect(w).toMatch(/rua/);
    expect(w).toMatch(/p=none/);
  });
  it("validates tags", () => {
    expect(() => buildDmarc(["rua=d@example.com"], "none", 100)).toThrow(/mailto/);
    expect(() => buildDmarc(["foo=bar"], "none", 100)).toThrow(/Unknown/);
    expect(() => buildDmarc(["adkim=x"], "none", 100)).toThrow();
    expect(() => buildDmarc(["sp=nope"], "none", 100)).toThrow();
    expect(() => buildDmarc(["rua=mailto:a@b.co", "rua=mailto:c@d.co"], "none", 100)).toThrow(/Duplicate/);
  });
});

describe("runSpfDmarc", () => {
  const base = { record: "spf" as const, spfAll: "~all" as const, dmarcPolicy: "none" as const, dmarcPct: 100 };
  it("formats output and surfaces errors", () => {
    expect(runSpfDmarc("a", base).output).toContain("Value: v=spf1 a ~all");
    expect(runSpfDmarc("zzz:1", base).error).not.toBeNull();
    expect(runSpfDmarc("", { ...base, record: "dmarc" }).output).toContain("Value: v=DMARC1; p=none");
  });
});
