import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sudoersGenerator } from "./transform";

const gen = (i: string, o: Parameters<typeof sudoersGenerator>[1] = {}) => sudoersGenerator(i, { header: false, noExec: false, ...o });

describe("sudoers generator", () => {
  it("single rule", () => {
    expect(gen("deploy: /usr/bin/systemctl restart app").output).toBe("deploy ALL=(ALL) /usr/bin/systemctl restart app\n");
  });
  it("NOPASSWD, groups and run-as", () => {
    expect(gen("%ops: /usr/bin/journalctl", { noPasswd: true, runAs: "root" }).output).toBe("%ops ALL=(root) NOPASSWD: /usr/bin/journalctl\n");
  });
  it("tags are combined", () => {
    expect(gen("a: /bin/ls", { noPasswd: true, noExec: true, setEnv: true, logOutput: true }).output).toContain("NOPASSWD: NOEXEC: SETENV: LOG_OUTPUT: /bin/ls");
  });
  it("aliases", () => {
    const out = gen("web: /bin/a, /bin/b", { useAliases: true }).output;
    expect(out).toContain("Cmnd_Alias CMDS_WEB_1 = /bin/a, /bin/b");
    expect(out).toContain("web ALL=(ALL) CMDS_WEB_1");
  });
  it("defaults", () => {
    const out = gen("a: /bin/ls", { timestampTimeout: 0, logfile: "/var/log/sudo.log" }).output;
    expect(out).toContain("Defaults:a timestamp_timeout=0");
    expect(out).toContain('Defaults:a logfile="/var/log/sudo.log"');
  });
  it("rejects relative commands, bad users, missing colon", () => {
    expect(gen("a: ls").error?.message).toMatch(/absolute/);
    expect(gen("a b: /bin/ls").error).not.toBeNull();
    expect(gen("nocolon /bin/ls").error).not.toBeNull();
    expect(gen("a: /bin/ls # x").error).not.toBeNull();
  });
  it("warns about dangerous grants", () => {
    const out = sudoersGenerator("a: ALL\nb: /usr/bin/vim /etc/hosts\nc: /bin/cat /var/log/*", { noPasswd: true, noExec: false }).output;
    expect(out).toMatch(/WARNING: a: ALL grants every command/);
    expect(out).toMatch(/NOPASSWD plus ALL/);
    expect(out).toMatch(/vim can spawn a shell/);
    expect(out).toMatch(/wildcard/);
  });
});

const visudo = spawnSync("visudo", ["--version"], { encoding: "utf8" }).status === 0;
describe.skipIf(!visudo)("accepted by visudo -cf", () => {
  const dir = mkdtempSync(join(tmpdir(), "sudo-"));
  const parse = (text: string) => {
    const f = join(dir, `s${Math.random().toString(36).slice(2)}`);
    writeFileSync(f, text, { mode: 0o440 });
    return spawnSync("visudo", ["-cf", f], { encoding: "utf8" });
  };
  const probe = parse("root ALL=(ALL) ALL\n");
  const works = probe.status === 0;
  const cases: [string, Parameters<typeof gen>[1]][] = [
    ["deploy: /usr/bin/systemctl restart app", {}],
    ["%ops: /usr/bin/journalctl -u app, /usr/bin/systemctl status app", { noPasswd: true, runAs: "root" }],
    ["alice: /bin/ls\nbob: /bin/cat /etc/hostname", { useAliases: true, noExec: true, setEnv: true, logOutput: true }],
    ["web: sudoedit /etc/nginx/nginx.conf", { runAs: "root:root" }],
    ["#1001: /bin/true", { host: "web01, web02" }],
    ["a: ALL", { timestampTimeout: 0, logfile: "/var/log/sudo.log", noPasswd: true }],
    ["+admins: /bin/true", { runAs: "ALL, !root" }],
  ];
  it.skipIf(!works)("oracle really rejects bad syntax", () => {
    expect(parse("a ALL=(ALL) NOPE: /bin/true\n").status).not.toBe(0);
  });
  cases.forEach(([i, o], n) =>
    it.skipIf(!works)(`case ${n}`, () => {
      const r = gen(i, o);
      expect(r.error).toBeNull();
      const p = parse(r.output);
      expect(p.status, p.stdout + p.stderr + r.output).toBe(0);
    }),
  );
});
