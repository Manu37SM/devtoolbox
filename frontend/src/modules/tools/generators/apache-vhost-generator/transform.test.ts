import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { apacheVhostGenerator as gen, parseSites } from "./transform";

describe("input", () => {
  it("first name is ServerName, the rest are aliases, comments ignored", () => {
    expect(parseSites("example.com www.example.com *.example.com # note\n\napp.test")).toEqual([
      { name: "example.com", aliases: ["www.example.com", "*.example.com"] },
      { name: "app.test", aliases: [] },
    ]);
  });
  it("rejects bad host names", () => {
    expect(gen("not_a_host").error?.message).toMatch(/valid host name/);
    expect(gen("a.com b/c").error).not.toBeNull();
    expect(gen("example.com\"; Evil").error).not.toBeNull();
  });
  it("empty is empty", () => expect(gen("").output).toBe(""));
});

describe("blocks", () => {
  it("redirect mode has an :80 redirect and an :443 site with certs", () => {
    const out = gen("example.com", { tls: "redirect" }).output;
    expect(out).toContain("<VirtualHost *:80>");
    expect(out).toContain("RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]");
    expect(out).toContain("SSLCertificateFile /etc/letsencrypt/live/example.com/fullchain.pem");
    expect(out).toContain("Protocols h2 http/1.1");
    expect(out).toContain("sudo a2enmod ssl http2");
  });
  it("tls none is a plain :80 site", () => {
    const out = gen("example.com", { tls: "none", moduleHints: false }).output;
    expect(out).not.toContain("443");
    expect(out).not.toContain("SSL");
    expect(out).toContain("DocumentRoot /var/www/example.com/public");
  });
  it("modern profile is TLS 1.3 only", () => {
    const out = gen("example.com", { tlsProfile: "modern" }).output;
    expect(out).toContain("SSLProtocol -all +TLSv1.3");
    expect(out).not.toContain("SSLCipherSuite");
  });
  it("HSTS seconds", () => {
    expect(gen("example.com", { hsts: true, hstsDays: 180 }).output).toContain("max-age=15552000; includeSubDomains");
  });
  it("proxy mode with websockets", () => {
    const out = gen("api.example.com", { siteType: "proxy", websocket: true, proxyTarget: "http://127.0.0.1:8080" }).output;
    expect(out).toContain("ProxyPass / http://127.0.0.1:8080/");
    expect(out).toContain("ws://127.0.0.1:8080/$1 [P,L]");
    expect(out).toContain('RequestHeader set X-Forwarded-Proto "https"');
    expect(out).not.toContain("DocumentRoot");
  });
  it("php-fpm and spa", () => {
    expect(gen("a.test", { siteType: "php-fpm" }).output).toContain('SetHandler "proxy:unix:/run/php/php8.3-fpm.sock|fcgi://localhost"');
    expect(gen("a.test", { siteType: "spa" }).output).toContain("FallbackResource /index.html");
  });
  it("www redirect to apex produces a second 443 vhost that redirects", () => {
    const out = gen("www.example.com", { wwwRedirect: "to-apex" }).output;
    expect(out).toContain("ServerName example.com");
    expect(out).toContain("Redirect permanent / https://example.com/");
  });
  it("redirect-only sites need a URL", () => {
    expect(gen("old.test", { siteType: "redirect", redirectTo: "nope" }).error).not.toBeNull();
    expect(gen("old.test", { siteType: "redirect", redirectTo: "https://new.test" }).output).toContain("Redirect permanent / https://new.test/");
  });
  it("rejects dangerous option values", () => {
    expect(gen("a.test", { docRoot: '/x"\n</VirtualHost>' }).error).not.toBeNull();
    expect(gen("a.test", { siteType: "proxy", proxyTarget: "ftp://x" }).error).not.toBeNull();
    expect(gen("a.test", { serverAdmin: "not an email" }).error).not.toBeNull();
  });
});

// Oracle: apache2 -t on the generated file, with the modules the generator says it needs.
const MODS = "/usr/lib/apache2/modules";
const present = spawnSync("apache2", ["-v"], { encoding: "utf8" }).status === 0 && existsSync(`${MODS}/mod_ssl.so`);
describe.skipIf(!present)("accepted by apache2 -t", () => {
  const dir = mkdtempSync(join(tmpdir(), "vh-"));
  for (const d of ["logs", "www"]) mkdirSync(join(dir, d));
  const cert = join(dir, "c.pem");
  const key = join(dir, "k.pem");
  const mk = spawnSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", cert, "-days", "1", "-subj", "/CN=localhost"], { encoding: "utf8" });
  const all = ["mpm_event", "ssl", "socache_shmcb", "http2", "headers", "deflate", "filter", "proxy", "proxy_http", "proxy_wstunnel", "proxy_fcgi", "rewrite", "expires", "alias", "setenvif", "authz_core", "mime", "dir"];
  const check = (out: string) => {
    const conf = [
      ...all.map((m) => `LoadModule ${m}_module ${MODS}/mod_${m}.so`),
      `ServerRoot ${dir}`, `PidFile ${dir}/pid`, "ServerName localhost", `ErrorLog ${dir}/logs/e.log`, "Listen 18081", "Listen 18443",
      `Define APACHE_LOG_DIR ${dir}/logs`,
      'LogFormat "%h %l %u %t \\"%r\\" %>s %b" common',
      'LogFormat "%h %l %u %t \\"%r\\" %>s %b \\"%{Referer}i\\" \\"%{User-agent}i\\"" combined',
      'LogFormat "%v:%p %h %l %u %t \\"%r\\" %>s %O" vhost_combined',
      out,
    ].join("\n");
    const f = join(dir, `a${Math.random().toString(36).slice(2)}.conf`);
    writeFileSync(f, conf);
    return spawnSync("apache2", ["-t", "-f", f], { encoding: "utf8" });
  };
  const works = mk.status === 0 && check("").status === 0;
  const base = { certFile: cert, keyFile: key, docRoot: join(dir, "www"), logDir: "${APACHE_LOG_DIR}" };
  it.skipIf(!works)("oracle rejects an unknown directive", () => expect(check("NotADirective on").status).not.toBe(0));
  const cases: Array<[string, Parameters<typeof gen>[1]]> = [
    ["example.com www.example.com", {}],
    ["example.com", { tls: "none" }],
    ["example.com", { tls: "https-only", hsts: true, tlsProfile: "modern" }],
    ["www.example.com", { wwwRedirect: "to-apex", hsts: true, staticCache: true, allowOverride: true }],
    ["example.com", { wwwRedirect: "to-www", tls: "none" }],
    ["api.example.com", { siteType: "proxy", websocket: true, maxBodyMb: 50 }],
    ["api.example.com", { siteType: "proxy", tls: "none", proxyTarget: "unix:/run/app.sock|http://localhost" }],
    ["blog.example.com", { siteType: "php-fpm", staticCache: true, serverAdmin: "ops@example.com", logFormat: "vhost_combined" }],
    ["app.example.com", { siteType: "spa", noIndexes: false, compression: false, securityHeaders: false, logFormat: "common" }],
    ["old.example.com", { siteType: "redirect", redirectTo: "https://new.example.com/" }],
    ["a.test\nb.test *.b.test", { http2: false }],
  ];
  cases.forEach(([i, o], n) =>
    it.skipIf(!works)(`case ${n}: ${i.split("\n")[0]}`, () => {
      const r = gen(i, { ...base, ...o });
      expect(r.error).toBeNull();
      const p = check(r.output);
      expect(p.status, p.stdout + p.stderr + "\n" + r.output).toBe(0);
    }),
  );
});
