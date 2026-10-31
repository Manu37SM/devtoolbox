import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { firewallRuleBuilder, parseRules } from "./transform";
import type { FirewallRuleBuilderOptions } from "./schema";

const have = (bin: string) => spawnSync("sh", ["-c", `command -v ${bin}`]).status === 0;
const HAS_IPT = have("iptables-restore") && have("ip6tables-restore");
const HAS_NFT = have("nft");
const HAS_UFW = have("ufw") && process.getuid?.() === 0;
const FW_PY = spawnSync("/usr/bin/python3", ["-c", "import sys; sys.path.insert(0,'/usr/lib/python3/dist-packages'); from firewall.core.rich import Rich_Rule"]).status === 0;

const RULES = `
allow ssh from 10.0.0.0/8 comment office ssh
allow web
allow tcp 8000-8100,9000 from 192.168.1.0/24 to 192.168.1.5
deny udp 161
reject tcp 23
limit tcp 2222
allow dns
allow out tcp 443 comment updates
allow icmp from 203.0.113.0/24
allow tcp 5432 from 2001:db8::/32 on eth1
allow in on eth0 wireguard
`;

const gen = (o: Partial<FirewallRuleBuilderOptions>, input = RULES) => {
  const r = firewallRuleBuilder(input, o);
  expect(r.error).toBeNull();
  return r.output;
};
const tmp = (name: string, text: string) => {
  const f = join(mkdtempSync(join(tmpdir(), "fw-")), name);
  writeFileSync(f, text);
  return f;
};

const COMBOS: Partial<FirewallRuleBuilderOptions>[] = [
  {},
  { defaultIn: "reject", logDropped: true },
  { defaultIn: "accept", defaultOut: "drop" },
  { ipv6: false, allowPing: false, dropInvalid: false, allowEstablished: false, allowLoopback: false },
  { comments: false, flush: false },
];

describe.skipIf(!HAS_IPT)("iptables (checked with iptables-restore --test)", () => {
  it.each(COMBOS.map((c, i) => [i, c] as const))("combo %i", (_i, combo) => {
    const out = gen({ ...combo, backend: "iptables", format: "file" });
    const blocks = out.split(/^# IPv[46].*$/m).slice(1).map((b) => b.split("# Persist")[0]!);
    // RULES contains an IPv6-only rule, which forces an ip6tables block even when ipv6 is off.
    expect(blocks.length).toBe(2);
    out.split("\n").filter((l) => l.startsWith("# IPv")).forEach((h, i) => {
      const bin = h.startsWith("# IPv4") ? "iptables-restore" : "ip6tables-restore";
      const r = spawnSync(bin, ["--test", tmp("rules", blocks[i]!)], { encoding: "utf8" });
      expect({ bin, status: r.status, err: r.stderr }).toEqual({ bin, status: 0, err: "" });
    });
  });
  it("command form is valid shell and carries the same policies", () => {
    const out = gen({ backend: "iptables", format: "commands" });
    expect(out).toContain("iptables -P INPUT DROP");
    expect(out).toContain("iptables -A INPUT -p tcp -s 10.0.0.0/8 --dport 22");
    expect(spawnSync("sh", ["-n", tmp("s.sh", out)]).status).toBe(0);
  });
});

describe.skipIf(!HAS_NFT)("nftables (checked with nft -c)", () => {
  it.each(COMBOS.map((c, i) => [i, c] as const))("combo %i", (_i, combo) => {
    const out = gen({ ...combo, backend: "nftables", format: "file" });
    const r = spawnSync("nft", ["-c", "-f", tmp("r.nft", out)], { encoding: "utf8" });
    expect({ status: r.status, err: r.stderr }).toEqual({ status: 0, err: "" });
  });
  it("commands form embeds the same ruleset", () => {
    const out = gen({ backend: "nftables", format: "commands" });
    const inner = out.split("\n").slice(out.split("\n").findIndex((l) => l.startsWith("nft -f")) + 1).filter((l) => l !== "EOF" && !l.startsWith("#")).join("\n");
    expect(spawnSync("nft", ["-c", "-f", tmp("c.nft", inner)], { encoding: "utf8" }).status).toBe(0);
  });
});

describe.skipIf(!HAS_UFW)("ufw (checked with ufw --dry-run)", () => {
  it.each(COMBOS.map((c, i) => [i, c] as const))("combo %i", (_i, combo) => {
    const lines = gen({ ...combo, backend: "ufw" }, RULES.replace(/^allow tcp 5432.*$/m, "").replace(/^allow icmp.*$/m, "")).split("\n").filter((l) => l.startsWith("ufw ") && !l.includes("--force"));
    expect(lines.length).toBeGreaterThan(5);
    for (const line of lines) {
      const r = spawnSync("sh", ["-c", line.replace(/^ufw /, "ufw --dry-run ")], { encoding: "utf8" });
      expect({ line, status: r.status, err: r.stderr }).toEqual({ line, status: 0, err: "" });
    }
  });
});

describe.skipIf(!FW_PY)("firewalld (rich rules checked with firewalld's own parser)", () => {
  it("every rich rule parses", () => {
    const out = gen({ backend: "firewalld", ipv6: true }, RULES);
    const rules = [...out.matchAll(/--add-rich-rule='([^']+)'/g)].map((m) => m[1]!);
    expect(rules.length).toBeGreaterThan(4);
    const py = `import sys, json\nsys.path.insert(0,'/usr/lib/python3/dist-packages')\nfrom firewall.core.rich import Rich_Rule\nbad=[]\nfor r in json.loads(sys.stdin.read()):\n    try: Rich_Rule(rule_str=r)\n    except Exception as e: bad.append([r,str(e)])\nprint(json.dumps(bad))`;
    const res = spawnSync("/usr/bin/python3", ["-c", py], { input: JSON.stringify(rules), encoding: "utf8" });
    expect(JSON.parse(res.stdout)).toEqual([]);
  });
});

describe("rule parsing and safety (no external tools)", () => {
  it("expands services and defaults a bare port to TCP", () => {
    expect(parseRules("allow ssh")[0]).toMatchObject({ proto: "tcp", ports: ["22"] });
    expect(parseRules("allow 8080")[0]).toMatchObject({ proto: "tcp", ports: ["8080"] });
    expect(parseRules("allow dns")[0]).toMatchObject({ proto: "any", ports: ["53"] });
    expect(parseRules("allow udp ntp")[0]).toMatchObject({ proto: "udp", ports: ["123"] });
  });
  it("reads direction, interface, addresses and comments", () => {
    expect(parseRules('allow out tcp 443 from 10.0.0.0/8 to any on eth0 comment "web updates"')[0]).toMatchObject({ dir: "out", src: "10.0.0.0/8", iface: "eth0", comment: "web updates" });
  });
  it("strips shell metacharacters from comments", () => {
    const out = gen({ backend: "ufw" }, "allow ssh comment x'; rm -rf / #");
    expect(out).not.toMatch(/rm -rf \/ #|;/);
    expect(parseRules("allow ssh comment $(reboot)`id`")[0]!.comment).toBe("(reboot)id");
  });
  it.each([
    ["permit 22", /start with allow/],
    ["allow tcp 0", /between 1 and 65535/],
    ["allow tcp 70000", /between 1 and 65535/],
    ["allow tcp 100-50", /must go up|between/],
    ["allow tcp 22 from 999.1.1.1", /not an IPv4\/IPv6/],
    ["allow tcp 22 from 10.0.0.0/33", /not an IPv4\/IPv6/],
    ["allow icmp 22", /ICMP has no ports/],
    ["allow tcp 22 from 10.0.0.1 to 2001:db8::1", /both be IPv4 or both IPv6/],
    ["allow tcp 22 on bad iface!", /don't understand|interface/],
    ["allow tcp 22 frobnicate", /don't understand/],
  ])("rejects %s", (line, msg) => {
    expect(firewallRuleBuilder(line, {}).error?.message).toMatch(msg);
  });
  it("warns before locking you out over SSH", () => {
    expect(gen({ backend: "ufw" }, "allow web")).toMatch(/# WARNING: incoming traffic is denied by default and no rule allows SSH \(tcp 22\)/);
    expect(gen({ backend: "ufw" }, "allow ssh")).not.toMatch(/lock you out/);
    expect(gen({ backend: "ufw", sshPort: 2222 }, "allow ssh")).toMatch(/tcp 2222/);
    expect(gen({ backend: "ufw", defaultIn: "accept" }, "allow web")).not.toMatch(/lock you out/);
    expect(gen({ backend: "nftables" }, "allow tcp 20-30")).not.toMatch(/lock you out/);
  });
  it("warns about allow-all and outbound default deny", () => {
    expect(gen({ backend: "ufw" }, "allow ssh\nallow")).toMatch(/ALL incoming traffic/);
    expect(gen({ backend: "ufw", defaultOut: "drop" }, "allow ssh")).toMatch(/outgoing traffic is denied/);
  });
  it("puts the nft shebang on the first line", () => {
    expect(gen({ backend: "nftables" }, "allow ssh").split("\n")[0]).toBe("#!/usr/sbin/nft -f");
  });
  it("reports that firewalld skips outgoing rules and that ufw cannot do ICMP", () => {
    expect(gen({ backend: "firewalld" }, "allow ssh\nallow out tcp 443")).toMatch(/filters incoming traffic only/);
    expect(gen({ backend: "ufw" }, "allow ssh\nallow icmp")).toMatch(/cannot express ICMP/);
  });
  it("accepts blank input", () => {
    expect(firewallRuleBuilder("", { backend: "iptables" }).error).toBeNull();
  });
});
