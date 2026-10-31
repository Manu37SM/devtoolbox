import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { authorizedKeysBuilder, sshFingerprint } from "./transform";

// Real keys from `ssh-keygen`; skipped entirely when OpenSSH is not available.
const sk = spawnSync("ssh-keygen", ["-?"], { encoding: "utf8" });
const haveKeygen = !sk.error;
const dir = haveKeygen ? mkdtempSync(join(tmpdir(), "ak-")) : "";
const make = (type: string, bits: string | null, name: string) => {
  const f = join(dir, name);
  const args = ["-q", "-t", type, "-N", "", "-C", `${name}@test`, "-f", f];
  if (bits) args.push("-b", bits);
  const r = spawnSync("ssh-keygen", args, { encoding: "utf8" });
  return r.status === 0 ? readFileSync(`${f}.pub`, "utf8").trim() : null;
};

const ED = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl dev@laptop";
const gen = (i: string, o: Parameters<typeof authorizedKeysBuilder>[1] = {}) => authorizedKeysBuilder(i, { fingerprints: false, ...o });

describe("authorized_keys builder", () => {
  it("passes a key through unchanged with no options", () => {
    expect(gen(ED).output).toBe(ED + "\n");
  });
  it("prefixes options in a stable order", () => {
    const out = gen(ED, { noPortForwarding: true, noPty: true, from: "10.0.0.0/8, *.corp.example.com", command: "/usr/bin/rsync --server", expiry: "20271231" }).output;
    expect(out).toBe(`no-port-forwarding,no-pty,from="10.0.0.0/8,*.corp.example.com",command="/usr/bin/rsync --server",expiry-time="20271231" ${ED}\n`);
  });
  it("restrict replaces the individual no-* options", () => {
    const out = gen(ED, { restrict: true, noPty: true, command: "/bin/true" }).output;
    expect(out).toContain('restrict,command="/bin/true" ssh-ed25519');
    expect(out).not.toContain("no-pty");
  });
  it("escapes quotes and backslashes in the forced command", () => {
    expect(gen(ED, { command: 'echo "a\\b"' }).output).toContain('command="echo \\"a\\\\b\\""');
  });
  it("fingerprint matches the known value", () => {
    expect(sshFingerprint("AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl")).toBe("SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU");
    expect(authorizedKeysBuilder(ED, {}).output).toContain("# ssh-ed25519 256 SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU dev@laptop");
  });
  it("de-duplicates by key blob", () => {
    const out = gen(`${ED}\n${ED.replace("dev@laptop", "again")}`).output;
    expect(out.match(/ssh-ed25519 AAAA/g)).toHaveLength(1);
    expect(out).toContain("duplicate");
  });
  it("replaces or keeps existing options", () => {
    expect(gen(`no-pty ${ED}`, { noPortForwarding: true }).output).toBe(`no-port-forwarding ${ED}\n`);
    expect(gen(`command="a b" ${ED}`, { noPty: true, keepExisting: true }).output).toBe(`command="a b",no-pty ${ED}\n`);
  });
  it("rejects bad input", () => {
    expect(gen("hello world").error).not.toBeNull();
    expect(gen("ssh-ed25519 !!!!").error).not.toBeNull();
    expect(gen(ED.replace("ssh-ed25519", "ssh-rsa")).error?.message).toMatch(/declares type/);
    expect(gen(ED, { from: "a;b" }).error).not.toBeNull();
    expect(gen(ED, { expiry: "20271331" }).error).not.toBeNull();
    expect(gen(ED, { permitOpen: "nohost" }).error).not.toBeNull();
  });
});

describe.skipIf(!haveKeygen)("against OpenSSH ssh-keygen", { timeout: 30000 }, () => {
  const specs: [string, string | null][] = [["ed25519", null], ["rsa", "2048"], ["rsa", "3072"], ["ecdsa", "256"], ["ecdsa", "384"], ["ecdsa", "521"]];
  for (const [t, b] of specs) {
    it(`${t}${b ? "-" + b : ""}: fingerprint and size agree`, () => {
      const pub = make(t, b, `${t}${b ?? ""}`);
      if (!pub) return; // this OpenSSH build cannot make that key type
      const out = authorizedKeysBuilder(pub, { noPty: true, from: "192.0.2.0/24" }).output;
      const f = join(dir, `ak-${t}${b ?? ""}`);
      writeFileSync(f, out);
      const l = spawnSync("ssh-keygen", ["-l", "-f", f], { encoding: "utf8" });
      expect(l.status, l.stderr).toBe(0);
      // ssh-keygen prints "<bits> SHA256:… comment (TYPE)"; the first non-comment line is the one it reads
      const [bits, fp] = l.stdout.trim().split(/\s+/);
            expect(out).toContain(`# ${pub.split(" ")[0]} ${bits} ${fp}`);
    });
  }
  it("a deliberately corrupted key is rejected by us and by ssh-keygen", () => {
    const pub = make("ed25519", null, "bad")!;
    const bad = pub.replace(/AAAAC3NzaC1lZDI1NTE5AAAA../, "AAAAC3NzaC1lZDI1NTE5AAAAAA");
    const f = join(dir, "bad.pub");
    writeFileSync(f, bad + "\n");
    expect(spawnSync("ssh-keygen", ["-l", "-f", f], { encoding: "utf8" }).status).not.toBe(0);
    expect(authorizedKeysBuilder(bad, {}).error).not.toBeNull();
  });
});
