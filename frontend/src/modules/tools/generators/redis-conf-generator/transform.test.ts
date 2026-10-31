import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redisConfGenerator as gen, sha256Hex } from "./transform";

const lines = (s: string) => s.split("\n").filter((l) => l && !l.startsWith("#"));

describe("presets", () => {
  it("cache: LRU eviction, no persistence", () => {
    const l = lines(gen("", { preset: "cache" }).output);
    expect(l).toContain("maxmemory-policy allkeys-lru");
    expect(l).toContain('save ""');
    expect(l).toContain("appendonly no");
  });
  it("session: volatile-lru with rdb and aof", () => {
    const l = lines(gen("", { preset: "session" }).output);
    expect(l).toContain("maxmemory-policy volatile-lru");
    expect(l).toContain("appendonly yes");
    expect(l.some((x) => x.startsWith("save "))).toBe(true);
  });
  it("queue and durable never evict", () => {
    for (const p of ["queue", "durable"] as const) expect(lines(gen("", { preset: p }).output)).toContain("maxmemory-policy noeviction");
  });
  it("explicit options override the preset", () => {
    const l = lines(gen("", { preset: "cache", evictionPolicy: "allkeys-lfu", persistence: "aof", aofFsync: "always" }).output);
    expect(l).toContain("maxmemory-policy allkeys-lfu");
    expect(l).toContain("appendfsync always");
  });
});

describe("security", () => {
  it("hashes the ACL password and disables default user", () => {
    const out = gen("", { aclUser: "app", aclPassword: "s3cret-pass-phrase" }).output;
    expect(out).toContain(`user app on #${sha256Hex("s3cret-pass-phrase")} ~app:* &*`);
    expect(out).toContain("user default off");
    expect(out).not.toContain("s3cret-pass-phrase");
  });
  it("sha256 matches a known vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("plain ACL password produces a warning", () => {
    expect(gen("", { aclUser: "app", aclPassword: "x1x1x1x1", aclHashPassword: false }).output).toContain("# WARNING: ACL password is stored in plain text");
  });
  it("public bind without auth warns", () => {
    expect(gen("", { bind: "0.0.0.0" }).output).toContain("# WARNING: Redis listens on all interfaces without a password");
    expect(gen("", { bind: "0.0.0.0", requirePass: "a-very-long-password-123" }).output).not.toContain("all interfaces without a password");
  });
  it("short requirepass warns", () => {
    expect(gen("", { requirePass: "short" }).output).toContain("shorter than 16");
  });
  it("disable commands become rename-command lines", () => {
    const l = lines(gen("", { disableCommands: "flushall, config debug" }).output);
    expect(l).toContain('rename-command FLUSHALL ""');
    expect(l).toContain('rename-command DEBUG ""');
  });
  it("rejects values that would break the file", () => {
    expect(gen("", { requirePass: 'a b' }).error).not.toBeNull();
    expect(gen("", { dir: "/var/lib/re dis" }).error).not.toBeNull();
    expect(gen("", { maxMemory: "lots" }).error).not.toBeNull();
    expect(gen("", { aclUser: "default", aclPassword: "x" }).error).not.toBeNull();
    expect(gen("", { replicaOf: "justhost" }).error).not.toBeNull();
    expect(gen("", { disableCommands: "bad;cmd" }).error).not.toBeNull();
    expect(gen("maxmemory 1\nrequirepass x\n\u0001bad").error).not.toBeNull();
  });
});

describe("custom directives and warnings", () => {
  it("appends valid custom lines and flags overridden ones", () => {
    const r = gen("# comment\nmaxmemory-samples 10\nactive-expire-effort 3", { preset: "cache" });
    expect(lines(r.output)).toContain("active-expire-effort 3");
    expect(r.output).toContain('"maxmemory-samples" is set twice');
  });
  it("unlimited memory with eviction warns", () => {
    expect(gen("", { maxMemory: "0" }).output).toContain("never applies");
  });
  it("comments can be turned off", () => {
    expect(gen("", { comments: false }).output).not.toContain("####");
  });
});

// Oracle: let redis-server parse the generated file.
const ver = spawnSync("redis-server", ["--version"], { encoding: "utf8" });
describe.skipIf(ver.status !== 0)("accepted by redis-server", () => {
  const dir = mkdtempSync(join(tmpdir(), "rd-"));
  const load = (conf: string) => {
    const f = join(dir, `r${Math.random().toString(36).slice(2)}.conf`);
    writeFileSync(f, conf);
    const r = spawnSync("redis-server", [f, "--port", "0", "--dir", dir, "--logfile", ""], { encoding: "utf8", timeout: 2000 });
    const text = (r.stdout ?? "") + (r.stderr ?? "");
    return { ok: text.includes("Configuration loaded") && !text.includes("FATAL CONFIG FILE ERROR"), text };
  };
  const works = load("maxmemory 10mb\n").ok;
  it.skipIf(!works)("oracle rejects a bad directive", () => expect(load("not-a-directive 1\n").ok).toBe(false));
  const tlsOk = (() => {
    const f = join(dir, "t.crt");
    writeFileSync(f, "");
    return works && load(`tls-port 1\ntls-cert-file ${f}\n`).text.includes("FATAL") === false;
  })();
  const defrag = load("activedefrag yes\n").ok;
  const base = { dir };
  const cases: Array<[string, Parameters<typeof gen>[1], string?]> = [
    ["cache", { preset: "cache" }],
    ["session", { preset: "session", requirePass: "a-long-enough-password-1" }],
    ["queue unix socket", { preset: "queue", unixSocket: join(dir, "r.sock"), ioThreads: 4 }],
    ["durable + replica", { preset: "durable", replicaOf: "10.0.0.5 6379", masterAuth: "m4ster-secret", aofFsync: "always" }],
    ["acl hashed", { aclUser: "svc", aclPassword: "pw-with-symbols_!@#", aclKeyPattern: "svc:*" }],
    ["acl plain", { aclUser: "svc", aclPassword: "plainpw", aclHashPassword: false }],
    ["hardening", { disableCommands: "FLUSHALL FLUSHDB DEBUG", keyspaceEvents: "Ex", activeDefrag: defrag, lazyFree: false, slowlog: false }],
    ["custom everything", { preset: "custom", maxMemory: "2gb", evictionPolicy: "volatile-ttl", persistence: "rdb", rdbSave: "900 1 60 10000", databases: 4, timeout: 30, maxClients: 500, logLevel: "warning", comments: false }],
    ["no persistence, memory 0", { persistence: "none", maxMemory: "0" }],
    ["dual bind", { bind: "127.0.0.1 -::1", protectedMode: false }],
  ];
  cases.forEach(([name, o]) =>
    it.skipIf(!works)(name, () => {
      const r = gen("lua-time-limit 5000", { ...base, ...o });
      expect(r.error).toBeNull();
      const l = load(r.output);
      expect(l.ok, l.text + "\n" + r.output).toBe(true);
    }),
  );
  it.skipIf(!works || !tlsOk)("TLS block", () => {
    const f = join(dir, "x.pem");
    writeFileSync(f, "");
    const r = gen("", { ...base, tlsPort: 6380, tlsCert: f, tlsKey: f, tlsCa: f });
    expect(load(r.output).text).not.toContain("Bad directive");
  });
});
