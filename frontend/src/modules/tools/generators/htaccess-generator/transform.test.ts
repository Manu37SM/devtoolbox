import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { htaccessGenerator } from "./transform";

const gen = (i: string, o: Parameters<typeof htaccessGenerator>[1] = {}) => htaccessGenerator(i, o);
const none = { forceHttps: false, noIndexes: false, blockDotfiles: false, securityHeaders: false, gzip: false, cache: false, charset: false };

describe("htaccess generator", () => {
  it("https redirect", () => {
    const out = gen("", { ...none, forceHttps: true }).output;
    expect(out).toContain("RewriteCond %{HTTPS} !=on");
    expect(out).toContain("RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]");
  });
  it("behind proxy checks X-Forwarded-Proto", () => {
    expect(gen("", { ...none, forceHttps: true, behindProxy: true }).output).toContain("X-Forwarded-Proto");
  });
  it("redirect lines", () => {
    const out = gen("/old -> /new\n302 /tmp -> https://x.test/\n410 /gone\n^/blog/(.*)$ -> /posts/$1", none).output;
    expect(out).toContain("Redirect 301 /old /new");
    expect(out).toContain("Redirect 302 /tmp https://x.test/");
    expect(out).toContain("Redirect gone /gone");
    expect(out).toContain("RedirectMatch 301 ^/blog/(.*)$ /posts/$1");
  });
  it("SPA fallback is last in the rewrite block", () => {
    const out = gen("", { ...none, forceHttps: true, spa: true }).output;
    expect(out.indexOf("[L,R=301]")).toBeLessThan(out.indexOf("index.html"));
  });
  it("rejects bad input", () => {
    expect(gen("oops").error).not.toBeNull();
    expect(gen("418 /x -> /y").error).not.toBeNull();
    expect(gen("/x -> y").error).not.toBeNull();
    expect(gen("", { denyIps: "not-an-ip" }).error).not.toBeNull();
    expect(gen("", { corsOrigin: "https://a.com/path" }).error).not.toBeNull();
  });
  it("auth + IP block share one RequireAll so login cannot bypass the block", () => {
    const out = gen("", { ...none, authRealm: "x", denyIps: "10.0.0.1" }).output;
    const block = out.slice(out.indexOf("<RequireAll>"), out.indexOf("</RequireAll>"));
    expect(block).toContain("Require not ip 10.0.0.1");
    expect(block).toContain("Require valid-user");
  });
  it("empty and all-off yields nothing", () => expect(gen("", none).output).toBe(""));
});

// Oracle: embed the generated file in a <Directory> block and let Apache parse it.
const MODS = "/usr/lib/apache2/modules";
const apache = spawnSync("apache2", ["-v"], { encoding: "utf8" }).status === 0 && existsSync(`${MODS}/mod_rewrite.so`);
describe.skipIf(!apache)("accepted by apache2 -t", () => {
  const dir = mkdtempSync(join(tmpdir(), "htx-"));
  mkdirSync(join(dir, "www"));
  const mods = ["mpm_prefork", "rewrite", "headers", "expires", "deflate", "alias", "authz_core", "authz_host", "authn_core", "authn_file", "authz_user", "auth_basic", "mime", "dir", "setenvif", "filter"];
  const check = (out: string) => {
    const conf = [
      ...mods.map((m) => `LoadModule ${m}_module ${MODS}/mod_${m}.so`),
      `ServerRoot ${dir}`, `PidFile ${dir}/pid`, "ServerName localhost", `ErrorLog ${dir}/err.log`, "Listen 18080",
      `DocumentRoot ${dir}/www`, `<Directory ${dir}/www>`, "    AllowOverride All", out, "</Directory>",
    ].join("\n");
    const f = join(dir, `a${Math.random().toString(36).slice(2)}.conf`);
    writeFileSync(f, conf);
    return spawnSync("apache2", ["-t", "-f", f], { encoding: "utf8" });
  };
  const probe = check("Options -Indexes");
  const works = probe.status === 0;
  it.skipIf(!works)("oracle rejects an unknown directive", () => expect(check("NotADirective on").status).not.toBe(0));
  const cases: [string, Parameters<typeof gen>[1]][] = [
    ["", {}],
    ["", { forceHttps: true, behindProxy: true, www: "to-www", spa: true }],
    ["", { www: "to-apex", hsts: true, cacheDays: 30 }],
    ["/old -> /new\n302 /tmp -> https://x.test/\n410 /gone\n^/blog/(.*)$ -> /posts/$1\n410 ^/x", { forceHttps: true }],
    ["", { hotlinkDomain: "example.com", denyIps: "10.0.0.0/8, 192.168.1.5, 2001:db8::/32", corsOrigin: "https://app.example.com" }],
    ["", { authRealm: "Staff only", authFile: "/tmp/does-not-need-to-exist", corsOrigin: "*", errorPage404: "/404.html" }],
  ];
  cases.forEach(([i, o], n) =>
    it.skipIf(!works)(`case ${n}`, () => {
      const r = gen(i, o);
      expect(r.error).toBeNull();
      const p = check(r.output);
      expect(p.status, p.stdout + p.stderr + "\n" + r.output).toBe(0);
    }),
  );
});
