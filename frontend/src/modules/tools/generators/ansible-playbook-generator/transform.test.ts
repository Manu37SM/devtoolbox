import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { ansiblePlaybookGenerator as gen, shellSplit } from "./transform";

const FULL = `package nginx git curl
remove telnet
service nginx started enabled
copy ./app.conf /etc/app.conf mode=0644 owner=root backup=yes
template nginx.conf.j2 /etc/nginx/nginx.conf mode=0644 notify="restart nginx" validate="nginx -t -c %s"
file /var/www state=directory mode=0755 owner=www-data
user deploy shell=/bin/bash groups=sudo,docker
group deployers gid=2000
lineinfile /etc/ssh/sshd_config regexp="^#?PermitRootLogin" line="PermitRootLogin no" notify="reload sshd"
cron backup minute=0 hour=2 job=/usr/local/bin/backup.sh user=root
git repo=https://github.com/example/app.git dest=/opt/app version=main
get_url https://example.com/tool.tgz /tmp/tool.tgz mode=0644
unarchive /tmp/tool.tgz /opt/tool remote_src=yes
apt_repo docker uris=https://download.docker.com/linux/debian suites=bookworm components=stable signed_by=https://download.docker.com/linux/debian/gpg
command systemctl daemon-reload creates=/etc/done
shell echo hi > /tmp/hi chdir=/tmp
hostname web01
wait_for port=443 host=127.0.0.1 timeout=30
debug "Done: {{ inventory_hostname }}"
service nginx restarted when="ansible_os_family == 'Debian'" register=svc tags=web,restart`;

describe("ansible playbook generator", () => {
  it("shell-like splitting", () => {
    expect(shellSplit(`a "b c" d='e f' g`)).toEqual(["a", "b c", "d=e f", "g"]);
    expect(shellSplit('a "b')).toBeNull();
  });
  it("renders a simple play", () => {
    const y = load(gen("package nginx\nservice nginx started enabled", { packageModule: "apt" }).output) as Record<string, unknown>[];
    expect(y[0]).toMatchObject({ name: "Configure servers", hosts: "all", become: true, gather_facts: true });
    const tasks = y[0]!.tasks as Record<string, unknown>[];
    expect(tasks[0]).toMatchObject({ "ansible.builtin.apt": { name: "nginx", state: "present", update_cache: true, cache_valid_time: 3600 } });
    expect(tasks[1]).toMatchObject({ "ansible.builtin.service": { name: "nginx", state: "started", enabled: true } });
  });
  it("modes stay strings; booleans and ints are coerced", () => {
    const out = gen("file /x mode=0755\nwait_for port=443 timeout=30\ncopy a b backup=yes").output;
    expect(out).toMatch(/mode: '0755'/);
    expect(out).toMatch(/port: 443/);
    expect(out).toMatch(/backup: true/);
  });
  it("creates deduplicated handlers from notify", () => {
    const y = load(gen('template a.j2 /etc/a notify="restart nginx"\ntemplate b.j2 /etc/b notify="restart nginx"').output) as Record<string, unknown>[];
    expect(y[0]!.handlers).toEqual([{ name: "restart nginx", "ansible.builtin.service": { name: "nginx", state: "restarted" } }]);
  });
  it("short module names and auto tags", () => {
    const out = gen("package git", { fqcn: false, autoTags: true }).output;
    expect(out).toContain("package:");
    expect(out).not.toContain("ansible.builtin");
    expect(out).toContain("- packages");
  });
  it("play variables", () => {
    const y = load(gen("debug hi", { vars: "app_port=8080, debug_mode=yes, env=prod" }).output) as Record<string, unknown>[];
    expect(y[0]!.vars).toEqual({ app_port: 8080, debug_mode: true, env: "prod" });
  });
  it("errors", () => {
    expect(gen("frobnicate x").error?.message).toMatch(/unknown task/);
    expect(gen("package").error).not.toBeNull();
    expect(gen("copy only-one").error).not.toBeNull();
    expect(gen("service nginx boom").error).not.toBeNull();
    expect(gen('debug "unterminated').error).not.toBeNull();
    expect(gen("file /x bogus=1").error?.message).toMatch(/does not take bogus=/);
    expect(gen('template a b notify="explode x"').error).not.toBeNull();
  });
});

// Oracle: ansible-core itself
const ans = spawnSync("ansible-playbook", ["--version"], { encoding: "utf8" });
const haveAnsible = ans.status === 0;
describe.skipIf(!haveAnsible)("accepted by ansible-core", { timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), "ans-"));
  const env = { ...process.env, ANSIBLE_LOCALHOST_WARNING: "False", ANSIBLE_INVENTORY_UNPARSED_WARNING: "False", ANSIBLE_HOME: join(dir, "home"), HOME: dir };
  const check = (text: string) => {
    const f = join(dir, `p${Math.random().toString(36).slice(2)}.yml`);
    writeFileSync(f, text);
    return spawnSync("ansible-playbook", ["--syntax-check", "-i", "localhost,", f], { encoding: "utf8", env });
  };
  it("the oracle rejects a bogus module", () => {
    expect(check("---\n- hosts: all\n  tasks:\n    - name: x\n      ansible.builtin.nonexistent: {}\n").status).not.toBe(0);
  });
  for (const pm of ["package", "apt", "dnf", "yum"] as const) {
    it(`passes --syntax-check (${pm}, FQCN)`, () => {
      const r = gen(FULL, { packageModule: pm, autoTags: true, vars: "a=1" });
      expect(r.error).toBeNull();
      const p = check(r.output);
      expect(p.status, p.stdout + p.stderr + r.output).toBe(0);
    });
  }
  it("passes with short module names", () => {
    const r = gen(FULL, { fqcn: false });
    const p = check(r.output);
    expect(p.status, p.stdout + p.stderr).toBe(0);
  });
  it("every parameter we emit is a documented option of that module", () => {
    const y = load(gen(FULL, { packageModule: "apt" }).output) as Record<string, unknown>[];
    const tasks = [...(y[0]!.tasks as Record<string, unknown>[]), ...(y[0]!.handlers as Record<string, unknown>[])];
    const mods = new Map<string, Set<string>>();
    for (const t of tasks) {
      const m = Object.keys(t).find((k) => k.startsWith("ansible.builtin."))!;
      const params = t[m];
      if (params && typeof params === "object") for (const k of Object.keys(params as object)) (mods.get(m) ?? mods.set(m, new Set()).get(m)!).add(k);
    }
    for (const [m, keys] of mods) {
      const doc = spawnSync("ansible-doc", ["-t", "module", "-j", m], { encoding: "utf8", env });
      expect(doc.status, `${m}: ${doc.stderr}`).toBe(0);
      const opts = (JSON.parse(doc.stdout) as Record<string, { doc: { options?: Record<string, { aliases?: string[] }> } }>)[m]!.doc.options ?? {};
      const known = new Set(Object.entries(opts).flatMap(([k, v]) => [k, ...(v.aliases ?? [])]));
      for (const k of keys) expect(known.has(k), `${m} has no option "${k}"`).toBe(true);
    }
  });
});
