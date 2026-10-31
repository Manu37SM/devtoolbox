import type { TransformResult } from "@/lib/tool-transform";
import type { ApacheVhostGeneratorOptions } from "./schema";

type Opts = ApacheVhostGeneratorOptions;

const HOST = /^(?:\*\.)?(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$|^localhost$/;

const INTERMEDIATE_CIPHERS =
  "ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384";

interface Site {
  name: string;
  aliases: string[];
}

export function parseSites(input: string): Site[] {
  const sites: Site[] = [];
  for (const [i, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const names = line.split(/[\s,]+/).filter(Boolean);
    for (const n of names) if (!HOST.test(n)) throw new Error(`Line ${i + 1}: "${n}" is not a valid host name`);
    sites.push({ name: names[0]!, aliases: names.slice(1) });
  }
  return sites;
}

const sub = (tpl: string, d: string) => tpl.split("{domain}").join(d);
const noCtl = (s: string, what: string) => {
  if (/[\u0000-\u001f"\\]/.test(s)) throw new Error(`${what} may not contain quotes, backslashes or control characters`);
  return s;
};

export function buildVhosts(sites: Site[], o: Opts): { text: string; modules: string[] } {
  const modules = new Set<string>();
  const blocks: string[] = [];
  const tlsOn = o.tls !== "none";
  if (tlsOn) modules.add("ssl");
  if (o.http2 && tlsOn) modules.add("http2");

  const target = o.siteType === "proxy" ? noCtl(o.proxyTarget.trim(), "Proxy target") : "";
  if (o.siteType === "proxy" && !/^(?:https?|h2c?|ajp|fcgi):\/\/\S+$/.test(target) && !/^unix:\S+$/.test(target)) {
    throw new Error("Proxy target must look like http://127.0.0.1:3000, https://backend.internal or unix:/run/app.sock|http://localhost");
  }
  const redirectTo = noCtl(o.redirectTo.trim(), "Redirect target");
  if (o.siteType === "redirect" && !/^https?:\/\/\S+$/.test(redirectTo)) throw new Error("Redirect target must be an http:// or https:// URL");
  if (o.siteType === "php-fpm") noCtl(o.phpHandler.trim(), "PHP handler");
  if (o.serverAdmin && !/^[^\s@"]+@[^\s@"]+$/.test(o.serverAdmin.trim())) throw new Error("ServerAdmin must be an email address");

  const body = (s: Site, secure: boolean): string[] => {
    const L: string[] = [];
    const root = noCtl(sub(o.docRoot, s.name), "Document root");
    const log = (n: string) => `${o.logDir}/${s.name}-${n}.log`;
    L.push(`    ServerName ${s.name}`);
    if (s.aliases.length) L.push(`    ServerAlias ${s.aliases.join(" ")}`);
    if (o.serverAdmin) L.push(`    ServerAdmin ${o.serverAdmin.trim()}`);
    if (o.siteType !== "redirect" && o.siteType !== "proxy") L.push(`    DocumentRoot ${root}`);
    L.push("");
    if (secure) {
      if (o.http2) L.push("    Protocols h2 http/1.1");
      L.push("    SSLEngine on");
      L.push(`    SSLCertificateFile ${sub(o.certFile, s.name)}`);
      L.push(`    SSLCertificateKeyFile ${sub(o.keyFile, s.name)}`);
      if (o.tlsProfile === "modern") {
        L.push("    SSLProtocol -all +TLSv1.3");
      } else {
        L.push("    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1");
        L.push(`    SSLCipherSuite ${INTERMEDIATE_CIPHERS}`);
        L.push("    SSLHonorCipherOrder off");
      }
      L.push("    SSLSessionTickets off");
      L.push("");
      if (o.hsts) {
        modules.add("headers");
        L.push(`    Header always set Strict-Transport-Security "max-age=${o.hstsDays * 86400}; includeSubDomains"`);
      }
    }
    if (o.siteType === "redirect") {
      modules.add("alias");
      L.push(`    Redirect permanent / ${redirectTo.endsWith("/") ? redirectTo : redirectTo + "/"}`);
    } else {
      if (o.securityHeaders) {
        modules.add("headers");
        L.push('    Header always set X-Content-Type-Options "nosniff"');
        L.push('    Header always set X-Frame-Options "SAMEORIGIN"');
        L.push('    Header always set Referrer-Policy "strict-origin-when-cross-origin"');
        L.push("");
      }
      if (o.maxBodyMb > 0) L.push(`    LimitRequestBody ${o.maxBodyMb * 1024 * 1024}`, "");
      if (o.compression) {
        modules.add("deflate");
        modules.add("filter");
        L.push("    <IfModule mod_deflate.c>");
        L.push("        AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/json application/javascript application/xml image/svg+xml");
        L.push("    </IfModule>");
        L.push("");
      }
      if (o.siteType === "proxy") {
        modules.add("proxy");
        modules.add("proxy_http");
        if (secure) {
          modules.add("headers");
          L.push('    RequestHeader set X-Forwarded-Proto "https"');
        } else if (o.tls === "none") {
          modules.add("headers");
          L.push('    RequestHeader set X-Forwarded-Proto "http"');
        }
        L.push("    ProxyPreserveHost On");
        if (o.websocket) {
          modules.add("proxy_wstunnel");
          modules.add("rewrite");
          L.push("    RewriteEngine On");
          L.push("    RewriteCond %{HTTP:Upgrade} =websocket [NC]");
          L.push(`    RewriteRule ^/?(.*) ${target.replace(/^http/, "ws").replace(/\/+$/, "")}/$1 [P,L]`);
        }
        L.push(`    ProxyPass / ${target.endsWith("/") ? target : target + "/"}`);
        L.push(`    ProxyPassReverse / ${target.endsWith("/") ? target : target + "/"}`);
      } else {
        L.push(`    <Directory ${root}>`);
        const opts = o.noIndexes ? "-Indexes +FollowSymLinks" : "+Indexes +FollowSymLinks";
        L.push(`        Options ${opts}`);
        L.push(`        AllowOverride ${o.allowOverride ? "All" : "None"}`);
        L.push("        Require all granted");
        if (o.allowOverride) modules.add("rewrite");
        if (o.siteType === "spa") L.push("        FallbackResource /index.html");
        L.push("    </Directory>");
        if (o.siteType === "php-fpm") {
          modules.add("proxy");
          modules.add("proxy_fcgi");
          modules.add("setenvif");
          L.push("");
          L.push('    <FilesMatch "\\.php$">');
          L.push(`        SetHandler "proxy:${o.phpHandler.trim()}|fcgi://localhost"`);
          L.push("    </FilesMatch>");
          L.push("    DirectoryIndex index.php index.html");
        }
        if (o.staticCache) {
          modules.add("expires");
          modules.add("headers");
          L.push("");
          L.push('    <FilesMatch "\\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|avif|ico|woff2?)$">');
          L.push("        ExpiresActive On");
          L.push('        ExpiresDefault "access plus 30 days"');
          L.push('        Header append Cache-Control "public"');
          L.push("    </FilesMatch>");
        }
      }
    }
    L.push("");
    L.push(`    ErrorLog ${log("error")}`);
    if (o.logFormat === "vhost_combined") L.push(`    CustomLog ${log("access")} vhost_combined`);
    else L.push(`    CustomLog ${log("access")} ${o.logFormat}`);
    return L;
  };

  for (const s of sites) {
    const apex = s.name.replace(/^www\./, "");
    const www = "www." + apex;
    const header = `# ${s.name}${s.aliases.length ? " (+ " + s.aliases.join(", ") + ")" : ""}`;
    const out: string[] = [header];

    // Collapse www/non-www into redirect vhosts when asked
    let primary = s;
    let extraRedirect: Site | null = null;
    if (o.wwwRedirect !== "none") {
      const main = o.wwwRedirect === "to-apex" ? apex : www;
      const other = o.wwwRedirect === "to-apex" ? www : apex;
      primary = { name: main, aliases: s.aliases.filter((a) => a !== other && a !== main) };
      extraRedirect = { name: other, aliases: [] };
    }

    if (o.tls === "redirect") {
      modules.add("rewrite");
      const names = [primary.name, ...primary.aliases, ...(extraRedirect ? [extraRedirect.name] : [])];
      out.push("<VirtualHost *:80>");
      out.push(`    ServerName ${names[0]}`);
      if (names.length > 1) out.push(`    ServerAlias ${names.slice(1).join(" ")}`);
      out.push("");
      out.push("    RewriteEngine On");
      out.push("    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]");
      out.push("    # Let's Encrypt HTTP-01 challenges can be excluded by adding before the rule:");
      out.push("    # RewriteCond %{REQUEST_URI} !^/\\.well-known/acme-challenge/");
      out.push("</VirtualHost>");
      out.push("");
    } else if (o.tls === "none") {
      out.push("<VirtualHost *:80>");
      out.push(...body(primary, false));
      out.push("</VirtualHost>");
      if (extraRedirect) {
        out.push("");
        out.push("<VirtualHost *:80>");
        out.push(`    ServerName ${extraRedirect.name}`);
        out.push(`    Redirect permanent / http://${primary.name}/`);
        out.push("</VirtualHost>");
        modules.add("alias");
      }
      blocks.push(out.join("\n"));
      continue;
    }
    out.push("<VirtualHost *:443>");
    out.push(...body(primary, true));
    out.push("</VirtualHost>");
    if (extraRedirect) {
      out.push("");
      out.push("<VirtualHost *:443>");
      out.push(`    ServerName ${extraRedirect.name}`);
      if (o.http2) out.push("    Protocols h2 http/1.1");
      out.push("    SSLEngine on");
      out.push(`    SSLCertificateFile ${sub(o.certFile, primary.name)}`);
      out.push(`    SSLCertificateKeyFile ${sub(o.keyFile, primary.name)}`);
      out.push(`    Redirect permanent / https://${primary.name}/`);
      out.push("</VirtualHost>");
      modules.add("alias");
    }
    blocks.push(out.join("\n"));
  }

  let text = blocks.join("\n\n");
  const mods = [...modules];
  const preface: string[] = [];
  if (o.moduleHints && mods.length) {
    preface.push("# Required modules (Debian/Ubuntu):", `#   sudo a2enmod ${mods.join(" ")}`);
    if (o.http2 && o.tls !== "none") preface.push("#   HTTP/2 needs the event or worker MPM:  sudo a2dismod mpm_prefork && sudo a2enmod mpm_event");
    preface.push("");
  }
  text = preface.join("\n") + text + "\n";
  return { text, modules: mods };
}

export function apacheVhostGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    siteType: options.siteType ?? "static",
    docRoot: options.docRoot ?? "/var/www/{domain}/public",
    tls: options.tls ?? "redirect",
    certFile: options.certFile ?? "/etc/letsencrypt/live/{domain}/fullchain.pem",
    keyFile: options.keyFile ?? "/etc/letsencrypt/live/{domain}/privkey.pem",
    tlsProfile: options.tlsProfile ?? "intermediate",
    http2: options.http2 ?? true,
    hsts: options.hsts ?? false,
    hstsDays: options.hstsDays ?? 365,
    proxyTarget: options.proxyTarget ?? "http://127.0.0.1:3000",
    websocket: options.websocket ?? false,
    phpHandler: options.phpHandler ?? "unix:/run/php/php8.3-fpm.sock",
    redirectTo: options.redirectTo ?? "https://example.com/",
    wwwRedirect: options.wwwRedirect ?? "none",
    securityHeaders: options.securityHeaders ?? true,
    compression: options.compression ?? true,
    staticCache: options.staticCache ?? false,
    noIndexes: options.noIndexes ?? true,
    allowOverride: options.allowOverride ?? false,
    logDir: options.logDir ?? "${APACHE_LOG_DIR}",
    logFormat: options.logFormat ?? "combined",
    serverAdmin: options.serverAdmin ?? "",
    maxBodyMb: options.maxBodyMb ?? 0,
    moduleHints: options.moduleHints ?? true,
  };
  try {
    const sites = parseSites(input);
    if (sites.length === 0) return { output: "", error: null };
    return { output: buildVhosts(sites, o).text, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
