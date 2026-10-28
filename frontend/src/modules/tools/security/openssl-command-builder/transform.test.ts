import { describe, expect, it } from "vitest";
import { buildOpenssl, buildSan, buildSubject, sh } from "./transform";

const base = { task: "self-signed" as const, digest: "sha256" as const, encryptKey: false };

describe("helpers", () => {
  it("quotes only when needed", () => {
    expect(sh("a.crt")).toBe("a.crt");
    expect(sh("/C=US/CN=x y")).toBe("'/C=US/CN=x y'");
    expect(sh("it's")).toBe(`'it'\\''s'`);
  });
  it("builds subject and SAN", () => {
    expect(buildSubject({ c: "US", o: "Acme", cn: "a.com" })).toBe("/C=US/O=Acme/CN=a.com");
    expect(buildSan({ cn: "a.com", san: "b.com, 10.0.0.1" })).toBe("DNS:a.com,DNS:b.com,IP:10.0.0.1");
  });
});

describe("buildOpenssl", () => {
  it("self-signed with SAN", () => {
    const r = buildOpenssl("cn: localhost\nsan: 127.0.0.1\ndays: 30", base);
    expect(r.output).toContain("openssl req -x509 -newkey rsa:2048 -nodes -keyout server.key -out server.crt -days 30 -sha256 -subj /CN=localhost");
    expect(r.output).toContain("subjectAltName=DNS:localhost,IP:127.0.0.1");
    expect(r.output).toContain("unencrypted");
  });
  it("encrypted key drops -nodes", () => {
    expect(buildOpenssl("cn: a.com", { ...base, encryptKey: true }).output).not.toContain("-nodes");
  });
  it("requires cn for csr", () => {
    expect(buildOpenssl("", { ...base, task: "csr" }).error?.message).toMatch(/cn/);
  });
  it("other tasks", () => {
    expect(buildOpenssl("host: example.com", { ...base, task: "s-client" }).output).toContain("-connect example.com:443 -servername example.com");
    expect(buildOpenssl("", { ...base, task: "check-key-match" }).output).toContain("openssl pkey -in server.key -pubout | openssl sha256");
    expect(buildOpenssl("bits: 1024", { ...base, task: "rsa-key" }).output).toContain("WARNING");
    expect(buildOpenssl("ca: ca.pem", { ...base, task: "verify-chain" }).output).toContain("openssl verify -CAfile ca.pem server.crt");
    expect(buildOpenssl("bits: x", base).error).not.toBeNull();
  });
});
