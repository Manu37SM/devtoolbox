import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fail2banConfigGenerator as gen } from "./transform";

const REGEX = "^\\S+ myapp\\[\\d+\\]: login failed for \\S+ from <HOST>$";

describe("fail2ban generator", () => {
  it("sshd preset needs no filter section", () => {
    const out = gen("", { preset: "sshd" }).output;
    expect(out).toContain("[sshd]\nenabled = true\nport = ssh");
    expect(out).not.toContain("filter.d");
    expect(out).toContain("ignoreip = 127.0.0.1/8 ::1");
  });
  it("custom jail emits a filter file", () => {
    const out = gen(REGEX + "\n^other <HOST>$", { preset: "custom", jailName: "myapp", logpath: "/var/log/myapp.log" }).output;
    expect(out).toContain("# ---- /etc/fail2ban/filter.d/myapp.conf ----");
    expect(out).toContain("failregex = ^\\S+ myapp");
    expect(out).toContain("            ^other <HOST>$");
  });
  it("ban increment, mail and sshd mode", () => {
    const out = gen("", { preset: "sshd", increment: true, destemail: "ops@example.com", report: "mwl", sshdMode: "aggressive", banaction: "nftables-multiport" }).output;
    expect(out).toContain("bantime.increment = true");
    expect(out).toContain("action = %(action_mwl)s");
    expect(out).toContain("mode = aggressive");
    expect(out).toContain("banaction_allports = nftables-allports");
  });
  it("errors", () => {
    expect(gen("no ip here", { preset: "custom", logpath: "/x" }).error?.message).toMatch(/<HOST>/);
    expect(gen("(<HOST>", { preset: "custom", logpath: "/x" }).error?.message).toMatch(/parentheses/);
    expect(gen(REGEX, { preset: "custom" }).error?.message).toMatch(/log path/);
    expect(gen("", { bantime: "forever" }).error).not.toBeNull();
    expect(gen("", { destemail: "nope" }).error).not.toBeNull();
    expect(gen("", { preset: "custom" }).output).toBe("");
  });
});

// Oracle: fail2ban-client -t and fail2ban-regex with the stock config tree
const f2b = spawnSync("fail2ban-client", ["--version"], { encoding: "utf8" });
// present AND able to test its own stock config (a non-root CI runner may not be)
const have = f2b.status === 0 && existsSync("/etc/fail2ban/jail.conf") && spawnSync("fail2ban-client", ["-c", "/etc/fail2ban", "-t"], { encoding: "utf8" }).status === 0;
describe.skipIf(!have)("accepted by fail2ban", { timeout: 60000 }, () => {
  const logDir = mkdtempSync(join(tmpdir(), "f2blog-"));
  const logs = join(logDir, "x.log");
  writeFileSync(logs, "");
  const setup = (text: string) => {
    const dir = mkdtempSync(join(tmpdir(), "f2b-"));
    cpSync("/etc/fail2ban", dir, { recursive: true });
    for (const f of readdirSync(join(dir, "jail.d"))) rmSync(join(dir, "jail.d", f)); // drop distro defaults (systemd backend)
    // split "# ---- path ----" sections into files, pointing log paths at our empty file
    const parts = text.split(/^# ---- (\S+) ----\n/m);
    for (let i = 1; i < parts.length; i += 2) {
      const target = join(dir, parts[i]!.replace("/etc/fail2ban/", ""));
      writeFileSync(target, parts[i + 1]!.replace(/^logpath = .*$/m, `logpath = ${logs}`).replace(/^# .*$/gm, ""));
    }
    return dir;
  };
  const test = (dir: string) => spawnSync("fail2ban-client", ["-c", dir, "-t"], { encoding: "utf8" });
  const base = { backend: "polling" as const };
  const cases: [string, Parameters<typeof gen>[1], string][] = [
    ["sshd", { preset: "sshd", ...base }, ""],
    ["sshd aggressive", { preset: "sshd", sshdMode: "aggressive", ...base }, ""],
    ["nginx-http-auth", { preset: "nginx-http-auth", ...base }, ""],
    ["nginx-botsearch", { preset: "nginx-botsearch", ...base }, ""],
    ["nginx-limit-req", { preset: "nginx-limit-req", ...base }, ""],
    ["apache-auth", { preset: "apache-auth", ...base }, ""],
    ["apache-badbots", { preset: "apache-badbots", ...base }, ""],
    ["postfix", { preset: "postfix", ...base }, ""],
    ["dovecot", { preset: "dovecot", ...base }, ""],
    ["recidive", { preset: "recidive", bantime: "1w", findtime: "1d", ...base }, ""],
    ["increment + email + nftables", { preset: "sshd", increment: true, destemail: "a@b.co", report: "mwl", banaction: "nftables-multiport", ...base }, ""],
    ["permanent ban, custom times", { preset: "sshd", bantime: "-1", findtime: "1h30m", maxretry: 3, ...base }, ""],
    ["custom jail", { preset: "custom", jailName: "myapp", logpath: "/var/log/myapp.log", port: "8080", ...base }, REGEX],
  ];
  it("the oracle rejects a broken config", () => {
    const dir = setup("# ---- /etc/fail2ban/jail.local ----\n[bogus]\nenabled = true\nfilter = does-not-exist\nlogpath = /x\n");
    expect(test(dir).status).not.toBe(0);
  });
  for (const [label, opts, input] of cases)
    it(label, () => {
      const r = gen(input, opts);
      expect(r.error).toBeNull();
      const dir = setup(r.output);
      const p = test(dir);
      expect(p.status, p.stdout + p.stderr + "\n" + r.output).toBe(0);
    });
  it("custom filter matches a real log line with fail2ban-regex", () => {
    const r = gen(REGEX, { preset: "custom", jailName: "myapp", logpath: "/var/log/myapp.log" });
    const dir = setup(r.output);
    const line = "host1 myapp[123]: login failed for admin from 203.0.113.9";
    const p = spawnSync("fail2ban-regex", [line, join(dir, "filter.d/myapp.conf")], { encoding: "utf8" });
    expect(p.stdout + p.stderr).toMatch(/Lines: 1 lines, 0 ignored, 1 matched, 0 missed/);
  });
});
