import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hostHash, knownHostsHasher as kh } from "./transform";

const SALT = "AAECAwQFBgcICQoLDA0ODxAREhM="; // 00 01 02 … 13
const KEY = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl";

describe("known_hosts hasher", () => {
  it("HMAC-SHA1 is stable for a fixed salt", () => {
    const h = hostHash(SALT, "github.com");
    expect(h).toMatch(/^[A-Za-z0-9+/]{27}=$/);
    expect(hostHash(SALT, "github.com")).toBe(h);
    expect(hostHash(SALT, "gitlab.com")).not.toBe(h);
  });
  it("hashes plain host names", () => {
    const out = kh("github.com", { salt: SALT }).output.trim();
    expect(out).toBe(`|1|${SALT}|${hostHash(SALT, "github.com")}`);
  });
  it("splits host lists into one entry per host and keeps markers", () => {
    const out = kh(`@cert-authority ex.com,10.0.0.1 ${KEY} comment`, { salt: SALT }).output.trim().split("\n");
    expect(out).toHaveLength(2);
    expect(out[0]).toBe(`@cert-authority |1|${SALT}|${hostHash(SALT, "ex.com")} ${KEY} comment`);
  });
  it("wraps non-default ports and lower-cases", () => {
    expect(kh("Example.COM", { salt: SALT, port: 2222 }).output).toContain(hostHash(SALT, "[example.com]:2222"));
    expect(kh("Example.COM", { salt: SALT, lowercase: false }).output).toContain(hostHash(SALT, "Example.COM"));
  });
  it("random salts differ per entry", () => {
    const [a, b] = kh("a.example\na.example", {}).output.trim().split("\n");
    expect(a).not.toBe(b);
  });
  it("leaves patterns alone and says so", () => {
    const out = kh(`*.corp.example ${KEY}`, { salt: SALT }).output;
    expect(out).toContain(`*.corp.example ${KEY}`);
    expect(out).toContain("cannot be hashed");
  });
  it("match mode", () => {
    const hashed = kh(`github.com,140.82.0.1 ${KEY}`, { salt: SALT }).output;
    const m = kh(`GitHub.com\n${hashed}\nother.example ${KEY}`, { action: "match" }).output;
    expect(m).toContain("is present (1 matching entry)");
    expect(kh(`nope.example\n${hashed}`, { action: "match" }).output).toContain("was not found");
    expect(kh(`github.com\nother.example ${KEY}`, { action: "match" }).output).toContain("was not found");
  });
  it("errors", () => {
    expect(kh("a b c", {}).error).not.toBeNull();
    expect(kh("host", { salt: "short" }).error).not.toBeNull();
    expect(kh("*.example", {}).error).not.toBeNull();
    expect(kh(`host.example ${KEY}`, { action: "match" }).error).not.toBeNull();
  });
});

// Oracle: OpenSSH itself
const haveSsh = spawnSync("ssh-keygen", ["-F", "x", "-f", "/dev/null"]).error === undefined;
describe.skipIf(!haveSsh)("interoperates with ssh-keygen", () => {
  const dir = mkdtempSync(join(tmpdir(), "kh-"));
  const find = (file: string, host: string) => spawnSync("ssh-keygen", ["-F", host, "-f", file], { encoding: "utf8" });
  it("ssh-keygen -F finds hosts we hashed (and not others)", () => {
    const f = join(dir, "ours");
    writeFileSync(f, kh(`github.com,140.82.0.1 ${KEY}\n[git.example]:2222 ${KEY}`, {}).output);
    expect(find(f, "github.com").status).toBe(0);
    expect(find(f, "140.82.0.1").status).toBe(0);
    expect(find(f, "[git.example]:2222").status).toBe(0);
    expect(find(f, "gitlab.com").status).not.toBe(0);
  });
  it("our matcher finds hosts hashed by ssh-keygen -H", () => {
    const f = join(dir, "theirs");
    writeFileSync(f, `alpha.example,10.1.2.3 ${KEY}\n[beta.example]:2200 ${KEY}\n`);
    const r = spawnSync("ssh-keygen", ["-H", "-f", f], { encoding: "utf8" });
    if (r.status !== 0) return; // sandboxed ssh-keygen without -H support
    const hashed = readFileSync(f, "utf8");
    expect(hashed).toContain("|1|");
    expect(kh(`alpha.example\n${hashed}`, { action: "match" }).output).toContain("is present");
    expect(kh(`10.1.2.3\n${hashed}`, { action: "match" }).output).toContain("is present");
    expect(kh(`[beta.example]:2200\n${hashed}`, { action: "match" }).output).toContain("is present");
    expect(kh(`gamma.example\n${hashed}`, { action: "match" }).output).toContain("was not found");
  });
});
