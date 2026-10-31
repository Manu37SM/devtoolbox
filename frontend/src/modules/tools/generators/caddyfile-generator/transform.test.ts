import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { caddyfileGenerator, parseSites } from "./transform";
import type { CaddyfileGeneratorOptions } from "./schema";

const HAS_CADDY = spawnSync("sh", ["-c", "command -v caddy"]).status === 0;

const SITES = `
example.com -> localhost:3000
api.example.com -> 10.0.0.5:8080, 10.0.0.6:8080
static.example.com => /var/www/html
docs.example.com => /srv/docs
old.example.com redirect 308 https://example.com{uri}
status.example.com respond OK
http://plain.example.com -> 127.0.0.1:9000
localhost -> 127.0.0.1:5000
`;
const gen = (o: Partial<CaddyfileGeneratorOptions>, input = SITES) => {
  const r = caddyfileGenerator(input, o);
  expect(r.error).toBeNull();
  return r.output;
};
const validate = (text: string) => {
  const f = join(mkdtempSync(join(tmpdir(), "caddy-")), "Caddyfile");
  writeFileSync(f, text);
  const r = spawnSync("caddy", ["validate", "--config", f, "--adapter", "caddyfile"], { encoding: "utf8", timeout: 20_000 });
  return { status: r.status, err: r.stderr.split("\n").filter((l) => /^Error:|"level":"(error|fatal)"/.test(l)).join("\n") };
};

const COMBOS: Partial<CaddyfileGeneratorOptions>[] = [
  {},
  { email: "ops@example.com", encode: "zstd", hsts: true, spa: true, fileBrowse: true, healthPath: "/health", lbPolicy: "least_conn", log: "stdout", maxBody: "10MB", adminOff: true, http3: false },
  { wwwRedirect: "to-apex", log: "file", encode: "none", securityHeaders: false, tlsInternal: true },
  { wwwRedirect: "to-www", lbPolicy: "ip_hash", encode: "gzip" },
  { lbPolicy: "random", healthPath: "/", hsts: true, securityHeaders: false },
  { lbPolicy: "first" },
];

describe.skipIf(!HAS_CADDY)("caddy validate (Caddy's own Caddyfile parser and provisioner)", () => {
  it.each(COMBOS.map((c, i) => [i, c] as const))("combo %i", (_i, combo) => {
    expect(validate(gen(combo))).toEqual({ status: 0, err: "" });
  });
});

describe.skipIf(!HAS_CADDY)("caddy fmt (output is already canonically formatted)", () => {
  it.each(COMBOS.map((c, i) => [i, c] as const))("combo %i", (_i, combo) => {
    const text = gen(combo);
    const f = join(mkdtempSync(join(tmpdir(), "caddyfmt-")), "Caddyfile");
    writeFileSync(f, text);
    expect(spawnSync("caddy", ["fmt", f], { encoding: "utf8" }).stdout).toBe(text);
  });
});

describe("caddyfileGenerator", () => {
  it("writes the right directives per site type", () => {
    const out = gen({});
    expect(out).toContain("reverse_proxy localhost:3000");
    expect(out).toContain("reverse_proxy 10.0.0.5:8080 10.0.0.6:8080 {\n\t\tlb_policy round_robin\n\t}");
    expect(out).toContain("root * /var/www/html");
    expect(out).toContain("file_server");
    expect(out).toContain("redir https://example.com{uri} 308");
    expect(out).toContain('respond "OK" 200');
  });
  it("uses internal TLS for localhost but not for http:// sites", () => {
    const out = gen({});
    expect(out).toMatch(/localhost \{\n\ttls internal/);
    expect(out).not.toMatch(/http:\/\/plain\.example\.com \{\n\ttls internal/);
  });
  it("adds options only where they apply", () => {
    const out = gen({ spa: true, fileBrowse: true, hsts: true, maxBody: "5MB", healthPath: "/up", email: "a@b.co", adminOff: true });
    expect(out.startsWith("{\n\temail a@b.co\n\tadmin off\n}")).toBe(true);
    expect(out).toContain("try_files {path} /index.html");
    expect(out).toContain("file_server browse");
    expect(out).toContain("health_uri /up");
    expect((out.match(/max_size 5MB/g) ?? []).length).toBe(4); // proxy sites only
    expect(out).toContain('Strict-Transport-Security "max-age=31536000; includeSubDomains"');
  });
  it("does not put encode or headers on redirects", () => {
    const out = gen({}, "old.example.com redirect https://new.example.com{uri}");
    expect(out).not.toMatch(/encode|header/);
  });
  it("handles www redirects both ways", () => {
    const apex = gen({ wwwRedirect: "to-apex" }, "example.com -> localhost:3000");
    expect(apex).toContain("www.example.com {\n\tredir https://example.com{uri} permanent\n}");
    const www = gen({ wwwRedirect: "to-www" }, "example.com -> localhost:3000");
    expect(www).toMatch(/^www\.example\.com \{/m);
    expect(www).toContain("example.com {\n\tredir https://www.example.com{uri} permanent\n}");
    expect(gen({ wwwRedirect: "to-apex" }, "localhost -> :3000".replace(":3000", "127.0.0.1:3000"))).not.toContain("www.");
  });
  it("rejects bad input with the line number", () => {
    expect(() => parseSites("example.com localhost:3000")).toThrow(/Line 1/);
    expect(() => parseSites("bad host -> x")).toThrow(/Line 1/);
    expect(() => parseSites("a.com -> bad;rm")).toThrow(/not a valid upstream/);
    expect(() => parseSites("a.com => /var/www; rm")).toThrow(/usable folder path/);
    expect(() => parseSites("a.com redirect javascript:alert(1)")).toThrow(/full URL/);
    expect(caddyfileGenerator("a.com -> b:1", { email: "nope" }).error).not.toBeNull();
    expect(caddyfileGenerator("a.com -> b:1", { maxBody: "lots" }).error).not.toBeNull();
    expect(caddyfileGenerator("a.com -> b:1", { healthPath: "health" }).error).not.toBeNull();
    expect(caddyfileGenerator("", {})).toEqual({ output: "", error: null });
  });
  it("strips quotes and braces from respond text so the file cannot be broken", () => {
    expect(gen({}, 'a.com respond hi" } evil {')).toContain('respond "hi  evil" 200');
  });
});
