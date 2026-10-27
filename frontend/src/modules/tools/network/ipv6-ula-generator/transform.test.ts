import { describe, expect, it } from "vitest";
import { generateUla, makeUla } from "./transform";

describe("makeUla", () => {
  it("builds an fdXX:XXXX:XXXX::/48 prefix from 40 random bits", () => {
    const u = makeUla(Uint8Array.from([0x12, 0x34, 0x56, 0x78, 0x9a]));
    expect(u.prefix).toBe("fd12:3456:789a::/48");
    expect(u.globalId).toBe("123456789a");
    expect(u.subnets).toEqual(["fd12:3456:789a:0000::/64", "fd12:3456:789a:0001::/64", "fd12:3456:789a:0002::/64", "fd12:3456:789a:0003::/64"]);
  });
  it("zero-pads small bytes", () => {
    expect(makeUla(Uint8Array.from([0, 0, 1, 0, 2])).prefix).toBe("fd00:0001:0002::/48");
  });
});

describe("generateUla", () => {
  it("emits the requested number of ULA prefixes in fd00::/8", () => {
    const lines = generateUla("", { count: 4, showSubnets: false }).output.split("\n");
    expect(lines).toHaveLength(4);
    for (const l of lines) expect(l).toMatch(/^fd[0-9a-f]{2}:[0-9a-f]{4}:[0-9a-f]{4}::\/48$/);
  });
  it("lists example /64 subnets when asked", () => {
    const out = generateUla("", { count: 1, showSubnets: true }).output;
    expect(out).toContain("Global ID");
    expect(out.match(/::\/64/g)).toHaveLength(4);
  });
  it("clamps the count", () => {
    expect(generateUla("", { count: 999, showSubnets: false }).output.split("\n")).toHaveLength(50);
    expect(generateUla("", { count: 0, showSubnets: false }).output.split("\n")).toHaveLength(1);
  });
});
