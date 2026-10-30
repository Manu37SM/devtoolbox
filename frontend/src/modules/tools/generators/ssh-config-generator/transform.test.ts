import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateSshConfig } from "./transform";

const INPUT = `bastion deploy@bastion.example.com:2222 key=~/.ssh/bastion_ed25519
db1 admin@10.0.1.5 jump=bastion key=~/.ssh/db_ed25519 L=5433:localhost:5432
web-* deploy@10.0.2.7 agent=yes timeout=5`;
const gen = (input: string, o = {}) => generateSshConfig(input, { comments: false, ...o });

describe("generateSshConfig", () => {
  it("builds host blocks with jump hosts, keys and forwards", () => {
    const r = gen(INPUT, { globalBlock: false });
    expect(r.error).toBeNull();
    expect(r.output).toContain("Host bastion\n    HostName bastion.example.com\n    User deploy\n    Port 2222\n    IdentityFile ~/.ssh/bastion_ed25519\n    IdentitiesOnly yes");
    expect(r.output).toContain("    ProxyJump bastion");
    expect(r.output).toContain("    LocalForward 5433 localhost:5432");
    expect(r.output).toContain("Host web-*\n    HostName 10.0.2.7");
    expect(r.output).toContain("    ForwardAgent yes\n    ConnectTimeout 5");
  });
  it("puts the shared 'Host *' block last with the chosen settings", () => {
    const r = gen("a user@a.example.com", { defaultUser: "me", defaultKey: "~/.ssh/id_ed25519", multiplexing: true, addKeysToAgent: true, keepAlive: 30, hostKeyChecking: "accept-new", compression: true });
    const star = r.output.slice(r.output.indexOf("Host *"));
    expect(r.output.indexOf("Host a")).toBeLessThan(r.output.indexOf("Host *"));
    for (const line of ["User me", "IdentityFile ~/.ssh/id_ed25519", "AddKeysToAgent yes", "ServerAliveInterval 30", "Compression yes", "StrictHostKeyChecking accept-new", "ControlMaster auto", "ControlPersist 10m"]) expect(star).toContain(line);
  });
  it("accepts IPv6 hosts, several aliases and jump chains", () => {
    const r = gen("one two ops@[2001:db8::1]:2200 jump=bastion,ops@gw.example.com", { globalBlock: false });
    expect(r.error?.message).toMatch(/jump host "bastion"/);
    const ok = gen("bastion b.example.com\none two ops@[2001:db8::1]:2200 jump=bastion,ops@gw.example.com", { globalBlock: false });
    expect(ok.output).toContain("Host one two\n    HostName 2001:db8::1\n    User ops\n    Port 2200");
    expect(ok.output).toContain("ProxyJump bastion,ops@gw.example.com");
  });
  it("validates aliases, ports, options and duplicates", () => {
    expect(gen("bad!alias h.example.com").error?.message).toMatch(/valid host alias/);
    expect(gen("a h.example.com:99999").error?.message).toMatch(/out of range/);
    expect(gen("a h.example.com foo=bar").error?.message).toMatch(/Unknown option/);
    expect(gen("a h.example.com\na h2.example.com").error).toMatchObject({ line: 2 });
    expect(gen("a a.example.com jump=a").error?.message).toMatch(/itself/);
  });
  it("adds comments and warns when host key checking is off", () => {
    const r = generateSshConfig("a user@h.example.com", { hostKeyChecking: "no" });
    expect(r.output).toContain("# a -> h.example.com");
    expect(r.output).toContain("WARNING");
  });
  it("handles empty input", () => {
    expect(generateSshConfig("", { globalBlock: false })).toEqual({ output: "", error: null });
  });
});

// The real ssh client is the judge of whether the file means what we intend.
const hasSsh = (() => {
  try {
    execFileSync("ssh", ["-V"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
describe.skipIf(!hasSsh)("ssh -G agrees", () => {
  it("resolves the effective settings as intended", () => {
    const cfg = gen(INPUT, { defaultUser: "fallback", keepAlive: 45, multiplexing: true });
    const dir = mkdtempSync(join(tmpdir(), "sshcfg-"));
    const file = join(dir, "config");
    writeFileSync(file, cfg.output);
    const g = (host: string) =>
      Object.fromEntries(
        execFileSync("ssh", ["-G", "-F", file, host], { encoding: "utf8" })
          .split(/\r?\n/)
          .map((l) => [l.slice(0, l.indexOf(" ")), l.slice(l.indexOf(" ") + 1)]),
      );
    const db = g("db1");
    expect(db.hostname).toBe("10.0.1.5");
    expect(db.user).toBe("admin");
    expect(db.proxyjump).toBe("bastion");
    expect(db.localforward).toMatch(/^5433 \[?localhost\]?:5432$/);
    expect(db.serveraliveinterval).toBe("45");
    expect(db.controlmaster).toBe("auto");
    const bastion = g("bastion");
    expect(bastion.port).toBe("2222");
    expect(g("web-1").hostname).toBe("10.0.2.7");
    expect(g("web-1").forwardagent).toBe("yes");
    expect(g("web-1").connecttimeout).toBe("5");
    expect(g("unlisted.example.com").user).toBe("fallback");
  });
});
