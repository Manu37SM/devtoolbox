import { describe, expect, it } from "vitest";
import { formatIp, parseIp, rangeToCidrs, runCidrAggregator } from "./transform";

const run = (s: string, output: "cidr" | "range" | "summary" = "cidr") => runCidrAggregator(s, { output });

describe("ip helpers", () => {
  it("parses and formats v6", () => {
    expect(formatIp(parseIp("2001:db8:0:0:0:0:0:1")!.n, true)).toBe("2001:db8::1");
    expect(formatIp(parseIp("::")!.n, true)).toBe("::");
    expect(parseIp("1::2::3")).toBeNull();
    expect(parseIp("256.1.1.1")).toBeNull();
  });
  it("range to cidrs matches python ipaddress.summarize_address_range", () => {
    expect(rangeToCidrs(parseIp("10.0.0.1")!.n, parseIp("10.0.0.6")!.n, false)).toEqual(["10.0.0.1/32", "10.0.0.2/31", "10.0.0.4/31", "10.0.0.6/32"]);
  });
});

describe("runCidrAggregator", () => {
  it("merges adjacent and overlapping blocks", () => {
    expect(run("10.0.0.0/25 10.0.0.128/25 10.0.1.0/24").output).toBe("10.0.0.0/23");
    expect(run("192.168.0.0/16\n192.168.5.0/24").output).toBe("192.168.0.0/16");
  });
  it("does not merge non-adjacent or misaligned neighbours", () => {
    expect(run("10.0.1.0/24 10.0.2.0/24").output).toBe("10.0.1.0/24\n10.0.2.0/24");
  });
  it("accepts bare IPs, host bits, v6 and mixed", () => {
    expect(run("1.1.1.1 1.1.1.0 1.1.1.2/31").output).toBe("1.1.1.0/30");
    expect(run("10.1.2.3/8").output).toBe("10.0.0.0/8");
    expect(run("2001:db8::/33 2001:db8:8000::/33 10.0.0.0/8").output).toBe("10.0.0.0/8\n2001:db8::/32");
  });
  it("range and summary output", () => {
    expect(run("10.0.0.0/24 10.0.1.0/24", "range").output).toBe("10.0.0.0 - 10.0.1.255");
    expect(run("10.0.0.0/24 10.0.1.0/24", "summary").output).toContain("IPv4 addresses covered: 512");
  });
  it("errors", () => {
    expect(run("10.0.0.0/33").error?.message).toMatch(/prefix/);
    expect(run("nope").error?.message).toMatch(/Invalid address/);
    expect(run("")).toEqual({ output: "", error: null });
  });
});
