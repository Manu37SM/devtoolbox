import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { logrotateConfigGenerator } from "./transform";

const gen = (input: string, o: Parameters<typeof logrotateConfigGenerator>[1] = {}) => logrotateConfigGenerator(input, o);

describe("logrotate generator", () => {
  it("renders defaults", () => {
    const r = gen("/var/log/app/*.log");
    expect(r.error).toBeNull();
    expect(r.output).toBe(`/var/log/app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640
}
`);
  });
  it("copytruncate replaces create", () => {
    const out = gen("/var/log/a.log", { method: "copytruncate" }).output;
    expect(out).toContain("copytruncate");
    expect(out).not.toMatch(/^    create /m);
    expect(out).toContain("# NOTE: copytruncate");
  });
  it("postrotate script and sharedscripts", () => {
    const out = gen("/a.log\n/b.log", { postrotate: "systemctl reload nginx", shared: true }).output;
    expect(out).toContain("/a.log /b.log {");
    expect(out).toContain("    postrotate\n        systemctl reload nginx\n    endscript");
    expect(out).toContain("sharedscripts");
  });
  it("rejects bad input", () => {
    expect(gen("relative.log").error?.message).toMatch(/absolute/);
    expect(gen("/a.log", { maxSize: "big" }).error).not.toBeNull();
    expect(gen("/a.log", { createMode: "999" }).error).not.toBeNull();
    expect(gen("/a.log", { createGroup: "adm" }).error).not.toBeNull();
    expect(gen("/a with space.log").error).not.toBeNull();
  });
  it("empty", () => expect(gen("").output).toBe(""));
});

// Oracle: logrotate -d parses the file and prints what it would do
const usable = (() => {
  const r = spawnSync("logrotate", ["--version"], { encoding: "utf8" });
  return r.status === 0 || /logrotate/i.test(r.stderr + r.stdout);
})();
const root = typeof process.getuid === "function" && process.getuid() === 0;

describe.skipIf(!usable || !root)("accepted by logrotate -d", () => {
  const dir = mkdtempSync(join(tmpdir(), "lr-"));
  chmodSync(dir, 0o755);
  const log = join(dir, "app.log");
  writeFileSync(log, "x\n".repeat(10));
  const check = (opts: Parameters<typeof gen>[1]) => {
    const r = gen(log, opts);
    expect(r.error).toBeNull();
    mkdirSync(join(dir, "o"), { recursive: true });
    const conf = join(dir, `c${Math.random().toString(36).slice(2)}.conf`);
    writeFileSync(conf, r.output, { mode: 0o644 });
    const p = spawnSync("logrotate", ["-d", "-s", join(dir, "state"), conf], { encoding: "utf8" });
    const text = p.stdout + p.stderr;
    expect(text, text).not.toMatch(/error:|unknown option|bad|duplicate/i);
    expect(p.status, text).toBe(0);
    expect(text).toContain(log);
  };
  const variants: Parameters<typeof gen>[1][] = [
    {}, { method: "copytruncate" }, { method: "none" }, { frequency: "weekly", rotate: 4, compress: "none" },
    { frequency: "monthly", dateExt: true, dateFormat: "-%Y-%m" }, { maxSize: "100M", minSize: "1k", maxAge: 30 },
    { createUser: "root", createGroup: "root", createMode: "0600" }, { suUser: "root", suGroup: "root" },
    { postrotate: "echo hi", prerotate: "echo pre", shared: true }, { compress: "xz" }, { compress: "zstd" }, { compress: "bzip2" },
    { missingOk: false, notIfEmpty: false },
  ];
  variants.forEach((v, i) => it(`variant ${i}`, () => check(v)));
});
