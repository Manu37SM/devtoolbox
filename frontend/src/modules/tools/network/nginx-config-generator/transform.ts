import type { TransformResult } from "@/lib/tool-transform";
import type { NginxConfigGeneratorOptions } from "./schema";

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

const ind = (s: string, n = 4) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

export function generateNginx(input: string, o: NginxConfigGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const f = fields(input);
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const domain = f.server_name ?? f.domain;
  if (!domain) return fail("Add a server_name: line (e.g. server_name: example.com www.example.com)");
  if (!/^[A-Za-z0-9.*_ -]+$/.test(domain)) return fail("server_name contains invalid characters");
  const primary = domain.split(/\s+/)[0]!;
  const root = f.root ?? `/var/www/${primary}`;
  const ssl = o.ssl || o.kind === "https-redirect";
  const certDir = f.cert_dir ?? `/etc/letsencrypt/live/${primary}`;

  if (o.kind === "https-redirect") {
    return { output: `server {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n`, error: null };
  }

  const upstreams = (f.upstream ?? "").split(/[,\s]+/).filter(Boolean);
  if ((o.kind === "reverse-proxy" || o.kind === "load-balancer") && !upstreams.length) return fail("Add an upstream: line (e.g. upstream: 127.0.0.1:8080)");
  if (o.kind === "load-balancer" && upstreams.length < 2) return fail("A load balancer needs at least two upstream servers");
  for (const u of upstreams) if (!/^[A-Za-z0-9._-]+:\d{1,5}$/.test(u) && !u.startsWith("unix:")) return fail(`Upstream "${u}" must be host:port`);

  const up = upstreams.length > 1 || o.kind === "load-balancer";
  const upName = (primary.replace(/[^A-Za-z0-9]/g, "_") + "_backend");
  const blocks: string[] = [];
  if (up) blocks.push(`upstream ${upName} {\n${f.lb === "least_conn" ? "    least_conn;\n" : f.lb === "ip_hash" ? "    ip_hash;\n" : ""}${upstreams.map((u) => `    server ${u};`).join("\n")}\n    keepalive 32;\n}\n`);
  if (ssl) blocks.push(`server {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain};\n    return 301 https://$host$request_uri;\n}\n`);

  const lines: string[] = [];
  if (ssl) {
    lines.push("listen 443 ssl;", "listen [::]:443 ssl;", "http2 on;");
  } else lines.push("listen 80;", "listen [::]:80;");
  lines.push(`server_name ${domain};`, "");
  if (ssl) {
    lines.push(`ssl_certificate     ${certDir}/fullchain.pem;`, `ssl_certificate_key ${certDir}/privkey.pem;`, "ssl_protocols TLSv1.2 TLSv1.3;", "ssl_session_cache shared:SSL:10m;", "ssl_session_timeout 1d;", "ssl_session_tickets off;", "");
    if (o.hsts) lines.push('add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;');
  }
  if (o.securityHeaders) lines.push('add_header X-Content-Type-Options "nosniff" always;', 'add_header X-Frame-Options "SAMEORIGIN" always;', 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;');
  if (o.gzip) lines.push("", "gzip on;", "gzip_comp_level 5;", "gzip_min_length 256;", "gzip_vary on;", "gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;");
  if (f.max_body) lines.push("", `client_max_body_size ${f.max_body};`);
  lines.push("");

  const target = up ? `http://${upName}` : `http://${upstreams[0]}`;
  switch (o.kind) {
    case "reverse-proxy":
    case "load-balancer": {
      const loc = [`proxy_pass ${target};`, "proxy_http_version 1.1;", "proxy_set_header Host $host;", "proxy_set_header X-Real-IP $remote_addr;", "proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;", "proxy_set_header X-Forwarded-Proto $scheme;"];
      if (o.websocket) loc.push("proxy_set_header Upgrade $http_upgrade;", 'proxy_set_header Connection "upgrade";', "proxy_read_timeout 86400s;");
      else if (up) loc.push('proxy_set_header Connection "";');
      lines.push(`location / {\n${ind(loc.join("\n"))}\n}`);
      break;
    }
    case "static-site":
      lines.push(`root ${root};`, "index index.html;", "", "location / {\n    try_files $uri $uri/ =404;\n}", "", "location ~* \\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$ {\n    expires 30d;\n    add_header Cache-Control \"public, immutable\";\n}");
      break;
    case "spa":
      lines.push(`root ${root};`, "index index.html;", "", "location / {\n    try_files $uri $uri/ /index.html;\n}", "", "location ~* \\.(?:css|js|png|jpg|jpeg|gif|svg|ico|woff2?)$ {\n    expires 30d;\n    add_header Cache-Control \"public, immutable\";\n}", "", "location = /index.html {\n    add_header Cache-Control \"no-cache\";\n}");
      break;
    case "php-fpm":
      lines.push(`root ${root};`, "index index.php index.html;", "", "location / {\n    try_files $uri $uri/ /index.php?$query_string;\n}", "", `location ~ \\.php$ {\n    include fastcgi_params;\n    fastcgi_pass ${f.fpm ?? "unix:/run/php/php-fpm.sock"};\n    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;\n}`, "", "location ~ /\\.(?!well-known) {\n    deny all;\n}");
      break;
  }
  blocks.push(`server {\n${ind(lines.join("\n"))}\n}\n`);
  return { output: blocks.join("\n").replace(/^ +$/gm, ""), error: null };
}
