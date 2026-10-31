import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { parseV6, reverseDnsNameGenerator as gen } from "./transform";

const run = (i: string, o: Parameters<typeof gen>[1] = {}) => gen(i, { bind: false, ...o });

describe("reverse DNS", () => {
  it("IPv4 and IPv6 PTR names", () => {
    expect(run("192.0.2.5").output).toContain("5.2.0.192.in-addr.arpa.");
    expect(run("2001:db8::1").output).toContain("1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa.");
  });
  it("octet-aligned and non-aligned IPv4 blocks", () => {
    expect(run("10.0.0.0/8").output).toContain("Zone       10.in-addr.arpa.");
    expect(run("172.16.0.0/16").output).toContain("16.172.in-addr.arpa.");
    const out = run("192.0.16.0/20").output;
    expect(out).toContain("delegate 16 zones of /24");
    expect(out).toContain("16.0.192.in-addr.arpa.");
    expect(out).toContain("31.0.192.in-addr.arpa.");
  });
  it("RFC 2317 classless", () => {
    const out = gen("192.0.2.128/25", {}).output;
    expect(out).toContain("128/25.2.0.192.in-addr.arpa.");
    expect(out).toContain("129\t3600\tIN\tCNAME\t129.128/25.2.0.192.in-addr.arpa.");
    expect(run("192.0.2.128/26", { classlessSeparator: "-" }).output).toContain("128-26.2.0.192.in-addr.arpa");
  });
  it("IPv6 prefixes", () => {
    expect(run("2001:db8::/32").output).toContain("Zone       8.b.d.0.1.0.0.2.ip6.arpa.");
    const out = run("2001:db8::/62").output;
    expect(out).toContain("delegate 4 zones of /64");
  });
  it("embedded IPv4 and errors", () => {
    expect(parseV6("::ffff:192.0.2.1")).toBe("00000000000000000000ffffc0000201");
    expect(run("999.1.1.1").error).not.toBeNull();
    expect(run("1.2.3.4/33").error).not.toBeNull();
    expect(run("2001:::1").error).not.toBeNull();
    expect(run("01.2.3.4").error).not.toBeNull();
  });
  it("bind snippet", () => {
    expect(gen("192.0.2.5", { hostname: "mail.example.org" }).output).toContain("5\t3600\tIN\tPTR\tmail.example.org.");
  });
});

// Oracle: Python ipaddress
const py = spawnSync("python3", ["-c", "import ipaddress"], { encoding: "utf8" }).status === 0;
describe.skipIf(!py)("matches Python ipaddress.reverse_pointer", () => {
  it("300 random addresses", () => {
    let s = 11;
    const r32 = () => (s = (s * 1664525 + 1013904223) >>> 0);
    const v4 = Array.from({ length: 150 }, () => [0, 0, 0, 0].map(() => r32() & 255).join("."));
    const v6 = Array.from({ length: 150 }, () => Array.from({ length: 8 }, () => ((r32() & 0xffff) * (r32() & 1)).toString(16)).join(":"));
    const all = [...v4, ...v6];
    const p = spawnSync("python3", ["-c", "import sys,json,ipaddress;print(json.dumps([ipaddress.ip_address(a).reverse_pointer for a in json.load(sys.stdin)]))"], { input: JSON.stringify(all), encoding: "utf8" });
    expect(p.status, p.stderr).toBe(0);
    const want = JSON.parse(p.stdout) as string[];
    all.forEach((a, i) => expect(run(a, { trailingDot: false }).output, a).toContain(`PTR name   ${want[i]}\n`));
  });
  it("zone enumeration for random IPv4 and IPv6 blocks", () => {
    let s = 21;
    const r32 = () => (s = (s * 1664525 + 1013904223) >>> 0);
    const blocks: string[] = [];
    for (let k = 0; k < 60; k++) blocks.push(`${r32() & 255}.${r32() & 255}.${r32() & 255}.0/${9 + (r32() % 15)}`.replace(/\.0\/(\d+)/, (_, n) => `.${r32() & 255}/${n}`));
    for (let k = 0; k < 40; k++) blocks.push(`2001:db8:${(r32() & 0xffff).toString(16)}::/${33 + (r32() % 31)}`);
    const script = `
import sys, json, ipaddress
res = []
for b in json.load(sys.stdin):
    n = ipaddress.ip_network(b, strict=False)
    if n.version == 4:
        child = ((n.prefixlen - 1)//8 + 1)*8 if n.prefixlen % 8 else n.prefixlen
        if n.prefixlen % 8 == 0: zones = [n.network_address.reverse_pointer.split('.', 4 - n.prefixlen//8)[-1]] if n.prefixlen else []
        else: zones = [s.network_address.reverse_pointer.split('.', 4 - child//8)[-1] for s in n.subnets(new_prefix=child)] if child <= 24 else None
    else:
        child = ((n.prefixlen - 1)//4 + 1)*4 if n.prefixlen % 4 else n.prefixlen
        zones = [s.network_address.reverse_pointer.split('.', 32 - child//4)[-1] for s in n.subnets(new_prefix=child)] if n.prefixlen % 4 else [n.network_address.reverse_pointer.split('.', 32 - n.prefixlen//4)[-1]]
    res.append(zones)
print(json.dumps(res))`;
    const p = spawnSync("python3", ["-c", script], { input: JSON.stringify(blocks), encoding: "utf8" });
    expect(p.status, p.stderr).toBe(0);
    const want = JSON.parse(p.stdout) as (string[] | null)[];
    blocks.forEach((b, i) => {
      const w = want[i];
      if (!w) return; // /25+ IPv4 uses RFC 2317, covered above
      const out = run(b, { trailingDot: false }).output;
      for (const z of w.slice(0, 256)) expect(out, `${b} ${z}`).toContain(z);
    });
  });
});
