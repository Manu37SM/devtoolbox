import { describe, expect, it } from "vitest";
import { classify, compress, expand, parseIpv6, reversePointer, runIpv6 } from "./transform";

describe("parse / compress / expand", () => {
  it("handles :: in all positions", () => {
    expect(expand(parseIpv6("::"))).toBe("0000:0000:0000:0000:0000:0000:0000:0000");
    expect(expand(parseIpv6("::1"))).toBe("0000:0000:0000:0000:0000:0000:0000:0001");
    expect(expand(parseIpv6("fe80::"))).toBe("fe80:0000:0000:0000:0000:0000:0000:0000");
    expect(expand(parseIpv6("2001:db8::ff00:42:8329"))).toBe("2001:0db8:0000:0000:0000:ff00:0042:8329");
  });
  it("compresses per RFC 5952", () => {
    expect(compress(parseIpv6("2001:0db8:0000:0000:0000:ff00:0042:8329"))).toBe("2001:db8::ff00:42:8329");
    expect(compress(parseIpv6("2001:db8:0:1:1:1:1:1"))).toBe("2001:db8:0:1:1:1:1:1"); // single zero group is not compressed
    expect(compress(parseIpv6("2001:0:0:1:0:0:0:1"))).toBe("2001:0:0:1::1"); // longest run wins
    expect(compress(parseIpv6("2001:db8:0:0:1:0:0:1"))).toBe("2001:db8::1:0:0:1"); // tie → first
    expect(compress(parseIpv6("0:0:0:0:0:0:0:0"))).toBe("::");
  });
  it("accepts embedded IPv4, brackets and zones", () => {
    expect(compress(parseIpv6("::ffff:192.0.2.128"))).toBe("::ffff:c000:280");
    expect(compress(parseIpv6("[fe80::1%eth0]"))).toBe("fe80::1");
  });
  it("rejects invalid input", () => {
    expect(() => parseIpv6("1::2::3")).toThrow(/::/);
    expect(() => parseIpv6("1:2:3")).toThrow(/8 groups/);
    expect(() => parseIpv6("12345::")).toThrow(/Invalid group/);
    expect(() => parseIpv6("1.2.3.4")).toThrow(/Not an IPv6/);
    expect(() => parseIpv6("1:2:3:4:5:6:7:8:9")).toThrow();
  });
});

describe("classify / reverse", () => {
  it("labels address types", () => {
    expect(classify(parseIpv6("::1"))).toContain("Loopback");
    expect(classify(parseIpv6("fe80::1"))).toContain("Link-local");
    expect(classify(parseIpv6("fd12:3456::1"))).toContain("Unique local");
    expect(classify(parseIpv6("2001:db8::1"))).toContain("Documentation");
    expect(classify(parseIpv6("2606:4700::1111"))).toContain("Global unicast");
    expect(classify(parseIpv6("ff02::1"))).toContain("link-local scope");
    expect(classify(parseIpv6("::ffff:1.2.3.4"))).toContain("IPv4-mapped");
  });
  it("builds ip6.arpa names", () => {
    expect(reversePointer(parseIpv6("2001:db8::567:89ab"))).toBe("b.a.9.8.7.6.5.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa");
  });
});

describe("runIpv6", () => {
  it("reports per-line errors and mapped IPv4", () => {
    const r = runIpv6("::ffff:1.2.3.4\nbad", { details: true });
    expect(r.output).toContain("IPv4:       1.2.3.4");
    expect(r.error?.line).toBe(2);
  });
});
