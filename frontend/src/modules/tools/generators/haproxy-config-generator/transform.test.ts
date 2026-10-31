import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { haproxyConfigGenerator } from "./transform";

const gen = (i: string, o: Parameters<typeof haproxyConfigGenerator>[1] = {}) => haproxyConfigGenerator(i, o);

describe("haproxy generator", () => {
  it("host-based routing", () => {
    const out = gen("example.com -> 10.0.0.1:8080, 10.0.0.2:8080\napi.example.com -> 10.0.0.3:9000").output;
    expect(out).toContain("acl host_example_com hdr(host),field(1,:) -i example.com");
    expect(out).toContain("use_backend be_api_example_com if host_api_example_com");
    expect(out).toContain("server s2 10.0.0.2:8080 check");
    expect(out).toContain("default_backend be_example_com");
  });
  it("wildcard suffix ACL", () => {
    expect(gen("*.example.com -> a:80").output).toContain("-i -m end .example.com");
  });
  it("tls adds 443, redirect and alpn", () => {
    const out = gen("a.com -> x:80", { tls: true, hsts: true }).output;
    expect(out).toContain("bind *:443 ssl crt /etc/haproxy/certs/site.pem alpn h2,http/1.1");
    expect(out).toContain("redirect scheme https code 301 unless { ssl_fc }");
    expect(out).toContain("Strict-Transport-Security");
  });
  it("tcp mode", () => {
    const out = gen(":5432 -> db1:5432, db2:5432", { mode: "tcp" }).output;
    expect(out).toContain("mode tcp");
    expect(out).toContain("bind *:5432");
    expect(out).not.toContain("httpchk");
  });
  it("stats without credentials only listens on localhost", () => {
    expect(gen("a.com -> x:80", { stats: true }).output).toContain("bind 127.0.0.1:8404");
  });
  it("rejects bad input", () => {
    expect(gen("a.com -> nohost").error).not.toBeNull();
    expect(gen("a.com -> x:99999").error).not.toBeNull();
    expect(gen("a b -> x:80").error).not.toBeNull();
    expect(gen("a.com -> x:80", { timeoutClient: "soon" }).error).not.toBeNull();
    expect(gen("a.com -> x:80\na-com -> y:80").error?.message).toMatch(/collides/);
  });
});

const hp = spawnSync("haproxy", ["-v"], { encoding: "utf8" }).status === 0;
describe.skipIf(!hp)("accepted by haproxy -c", () => {
  const dir = mkdtempSync(join(tmpdir(), "hap-"));
  // a minimal self-signed pem so `bind ... ssl crt` validates
  const key = spawnSync("sh", ["-c", `openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/k.pem -out ${dir}/c.pem -days 1 -subj /CN=t 2>/dev/null && cat ${dir}/c.pem ${dir}/k.pem > ${dir}/site.pem`]);
  const haveCert = key.status === 0;
  const check = (i: string, o: Parameters<typeof gen>[1]) => {
    const r = gen(i, { certPath: `${dir}/site.pem`, ...o });
    expect(r.error).toBeNull();
    const f = join(dir, `c${Math.random().toString(36).slice(2)}.cfg`);
    writeFileSync(f, r.output);
    const p = spawnSync("haproxy", ["-c", "-f", f], { encoding: "utf8" });
    expect(p.status, p.stdout + p.stderr + r.output).toBe(0);
  };
  const web = "example.com -> 10.0.0.1:8080, 10.0.0.2:8080\napi.example.com -> 10.0.0.3:9000\n*.cdn.example.com -> 10.0.0.4:80";
  it("plain http", () => check(web, {}));
  for (const b of ["roundrobin", "leastconn", "source", "uri", "first", "random"] as const) it(`balance ${b}`, () => check(web, { balance: b }));
  it("sticky + rate limit + stats", () => check(web, { sticky: true, rateLimit: 100, stats: true, statsAuth: "admin:s3cret" }));
  it.skipIf(!haveCert)("tls + hsts + http2", () => check(web, { tls: true, hsts: true, rateLimit: 50 }));
  it.skipIf(!haveCert)("tls without redirect", () => check(web, { tls: true, redirectHttps: false, http2: false }));
  it("no health check", () => check(web, { healthPath: "" }));
  it("tcp mode", () => check(":5432 -> 127.0.0.1:5432, 127.0.0.2:5432\n10.0.0.9:6379 -> 127.0.0.3:6379", { mode: "tcp", balance: "leastconn" }));
  it("ipv6 server", () => check("a.com -> [::1]:8080", {}));
});
