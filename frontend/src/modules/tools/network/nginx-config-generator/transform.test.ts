import { describe, expect, it } from "vitest";
import { generateNginx } from "./transform";

const base = { kind: "reverse-proxy" as const, ssl: true, hsts: true, gzip: true, websocket: false, securityHeaders: true };
const gen = (s: string, o = {}) => generateNginx(s, { ...base, ...o });
const IN = "server_name: example.com www.example.com\nupstream: 127.0.0.1:8080";

describe("generateNginx", () => {
  it("reverse proxy with TLS, redirect and HSTS", () => {
    const o = gen(IN).output;
    expect(o).toContain("return 301 https://$host$request_uri;");
    expect(o).toContain("listen 443 ssl;");
    expect(o).toContain("ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;");
    expect(o).toContain("Strict-Transport-Security");
    expect(o).toContain("proxy_pass http://127.0.0.1:8080;");
    expect(o).not.toContain("upstream ");
  });
  it("plain http when ssl off", () => {
    const o = gen(IN, { ssl: false, hsts: false }).output;
    expect(o).toContain("listen 80;");
    expect(o).not.toContain("ssl_certificate");
    expect(o).not.toContain("return 301");
  });
  it("websocket headers", () => {
    expect(gen(IN, { websocket: true }).output).toContain("proxy_set_header Upgrade $http_upgrade;");
  });
  it("load balancer builds an upstream block", () => {
    const o = gen("server_name: a.com\nupstream: 10.0.0.1:80, 10.0.0.2:80\nlb: least_conn", { kind: "load-balancer" }).output;
    expect(o).toContain("upstream a_com_backend {\n    least_conn;\n    server 10.0.0.1:80;\n    server 10.0.0.2:80;");
    expect(o).toContain("proxy_pass http://a_com_backend;");
  });
  it("spa, static, php, redirect", () => {
    expect(gen("server_name: a.com", { kind: "spa" }).output).toContain("try_files $uri $uri/ /index.html;");
    expect(gen("server_name: a.com\nroot: /srv/a", { kind: "static-site" }).output).toContain("root /srv/a;");
    expect(gen("server_name: a.com", { kind: "php-fpm" }).output).toContain("fastcgi_pass unix:/run/php/php-fpm.sock;");
    expect(gen("server_name: a.com", { kind: "https-redirect" }).output).toBe("server {\n    listen 80;\n    listen [::]:80;\n    server_name a.com;\n    return 301 https://$host$request_uri;\n}\n");
  });
  it("validation", () => {
    expect(gen("upstream: 1.1.1.1:80").error?.message).toMatch(/server_name/);
    expect(gen("server_name: a.com").error?.message).toMatch(/upstream/);
    expect(gen("server_name: a.com\nupstream: bad").error?.message).toMatch(/host:port/);
    expect(gen("server_name: a.com\nupstream: 1.1.1.1:80", { kind: "load-balancer" }).error?.message).toMatch(/two/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
});
