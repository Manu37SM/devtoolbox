import type { TransformResult } from "@/lib/tool-transform";
import type { HtaccessGeneratorOptions } from "./schema";

const CODES = new Set(["301", "302", "303", "307", "308", "410"]);
const IP = /^(\d{1,3}(\.\d{1,3}){3}(\/\d{1,2})?|[0-9a-fA-F:]+(\/\d{1,3})?)$/;

export function htaccessGenerator(input: string, options: Partial<HtaccessGeneratorOptions>): TransformResult {
  const o: HtaccessGeneratorOptions = {
    forceHttps: options.forceHttps ?? true, behindProxy: options.behindProxy ?? false, www: options.www ?? "none", spa: options.spa ?? false,
    noIndexes: options.noIndexes ?? true, blockDotfiles: options.blockDotfiles ?? true, securityHeaders: options.securityHeaders ?? true, hsts: options.hsts ?? false,
    gzip: options.gzip ?? true, cache: options.cache ?? true, cacheDays: options.cacheDays ?? 365, charset: options.charset ?? true,
    errorPage404: options.errorPage404 ?? "", hotlinkDomain: options.hotlinkDomain ?? "", denyIps: options.denyIps ?? "", corsOrigin: options.corsOrigin ?? "",
    authRealm: options.authRealm ?? "", authFile: options.authFile ?? "/home/user/.htpasswd",
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });

  // Redirect lines: [30x|410] /from -> /to     (a leading ^ makes /from a regular expression)
  const redirects: { code: string; from: string; to: string; regex: boolean }[] = [];
  for (const [i, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:(\d{3})\s+)?(\S+)\s*(?:->\s*(\S+))?$/.exec(line);
    if (!m) return fail(`Line ${i + 1}: expected "[301] /old -> /new" or "410 /gone" — got "${line}".`);
    const code = m[1] ?? (m[3] ? "301" : "410");
    if (!CODES.has(code)) return fail(`Line ${i + 1}: status ${code} is not one of 301, 302, 303, 307, 308 or 410.`);
    if (code !== "410" && !m[3]) return fail(`Line ${i + 1}: ${code} needs a target ("/old -> /new").`);
    const from = m[2]!;
    if (!from.startsWith("/") && !from.startsWith("^")) return fail(`Line ${i + 1}: source "${from}" must start with / (or ^ for a regex).`);
    if (/["\\]/.test(line)) return fail(`Line ${i + 1}: quotes and backslashes are not supported here.`);
    const to = m[3] ?? "";
    if (to && !/^(\/|https?:\/\/)/.test(to)) return fail(`Line ${i + 1}: target "${to}" must start with / or http(s)://.`);
    redirects.push({ code, from, to, regex: from.startsWith("^") });
  }

  const ips = o.denyIps.split(/[\s,]+/).filter(Boolean);
  for (const ip of ips) if (!IP.test(ip)) return fail(`"${ip}" is not an IP address or CIDR range.`);
  if (o.corsOrigin && !/^(\*|https?:\/\/[A-Za-z0-9.-]+(:\d+)?)$/.test(o.corsOrigin)) return fail("CORS origin must be * or an origin like https://app.example.com (no path, no trailing slash).");
  if (o.hotlinkDomain && !/^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(o.hotlinkDomain)) return fail("Hotlink domain must be a bare host name such as example.com.");
  if (o.errorPage404 && !/^\/[^\s"']*$/.test(o.errorPage404)) return fail("The 404 page must be a URL path such as /404.html.");
  if (o.authRealm) {
    if (/["\\]/.test(o.authRealm)) return fail("Realm must not contain quotes or backslashes.");
    if (!/^\/[^\s"']+$/.test(o.authFile)) return fail("The .htpasswd path must be absolute without spaces or quotes.");
  }

  const L: string[] = [];
  const section = (title: string, body: string[]) => { if (body.length) { if (L.length) L.push(""); L.push(`# ${title}`, ...body); } };
  const notes: string[] = [];

  section("Defaults", [
    ...(o.noIndexes ? ["Options -Indexes"] : []),
    ...(o.charset ? ["AddDefaultCharset UTF-8"] : []),
    ...(o.securityHeaders ? ["ServerSignature Off"] : []),
    ...(o.errorPage404 ? [`ErrorDocument 404 ${o.errorPage404}`] : []),
  ]);

  const rewrite: string[] = [];
  if (o.forceHttps) {
    rewrite.push("RewriteCond %{HTTPS} !=on");
    if (o.behindProxy) rewrite.push("RewriteCond %{HTTP:X-Forwarded-Proto} !https [NC]");
    rewrite.push("RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]");
  }
  if (o.www === "to-www") {
    if (rewrite.length) rewrite.push("");
    rewrite.push("RewriteCond %{HTTP_HOST} !^www\\. [NC]", "RewriteCond %{HTTP_HOST} !^$", "RewriteCond %{HTTP_HOST} !^[0-9.:]+(:\\d+)?$", "RewriteRule ^ %{REQUEST_SCHEME}://www.%{HTTP_HOST}%{REQUEST_URI} [L,R=301]");
  } else if (o.www === "to-apex") {
    if (rewrite.length) rewrite.push("");
    rewrite.push("RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]", "RewriteRule ^ %{REQUEST_SCHEME}://%1%{REQUEST_URI} [L,R=301]");
  }
  if (o.hotlinkDomain) {
    if (rewrite.length) rewrite.push("");
    const d = o.hotlinkDomain.replace(/\./g, "\\.");
    rewrite.push("RewriteCond %{HTTP_REFERER} !^$", `RewriteCond %{HTTP_REFERER} !^https?://([^/]+\\.)?${d}(/|$) [NC]`, "RewriteRule \\.(jpe?g|png|gif|webp|svg|avif)$ - [F,NC,L]");
  }
  if (o.blockDotfiles) {
    if (rewrite.length) rewrite.push("");
    rewrite.push('RewriteRule "(^|/)\\.(?!well-known/)" - [F,L]');
  }
  if (o.spa) {
    if (rewrite.length) rewrite.push("");
    rewrite.push("RewriteCond %{REQUEST_FILENAME} !-f", "RewriteCond %{REQUEST_FILENAME} !-d", "RewriteRule ^ index.html [L]");
  }
  if (rewrite.length) section("Rewrites (order matters: redirects first, SPA fallback last)", ["<IfModule mod_rewrite.c>", "    RewriteEngine On", "    RewriteBase /", ...rewrite.map((l) => (l ? `    ${l}` : l)), "</IfModule>"]);

  if (redirects.length) {
    section("Redirects", [
      "<IfModule mod_alias.c>",
      ...redirects.map((r) => {
        if (r.code === "410") return r.regex ? `    RedirectMatch gone ${r.from}` : `    Redirect gone ${r.from}`;
        return r.regex ? `    RedirectMatch ${r.code} ${r.from} ${r.to}` : `    Redirect ${r.code} ${r.from} ${r.to}`;
      }),
      "</IfModule>",
    ]);
    if (rewrite.length && o.spa) notes.push("Redirect directives are processed after mod_rewrite in some contexts; if a redirect is shadowed by the SPA fallback, move it into the RewriteRule block.");
  }

  // Top-level Require lines are OR-ed. Combining an IP block with Require valid-user outside a
  // RequireAll would let a valid login bypass the block (and the block alone would grant everyone else),
  // so both conditions live in one RequireAll (AND).
  if (o.authRealm) section("Basic authentication (create the file with: htpasswd -c <file> <user>)", ["AuthType Basic", `AuthName "${o.authRealm}"`, `AuthUserFile ${o.authFile}`]);
  if (ips.length || o.authRealm)
    section("Access control", ["<RequireAll>", "    Require all granted", ...ips.map((ip) => `    Require not ip ${ip}`), ...(o.authRealm ? ["    Require valid-user"] : []), "</RequireAll>"]);

  if (o.securityHeaders || o.hsts || o.corsOrigin) {
    const h: string[] = [];
    if (o.securityHeaders) h.push('Header always set X-Content-Type-Options "nosniff"', 'Header always set X-Frame-Options "SAMEORIGIN"', 'Header always set Referrer-Policy "strict-origin-when-cross-origin"', 'Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"');
    if (o.hsts) h.push('Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains" env=HTTPS');
    if (o.corsOrigin) h.push(`Header set Access-Control-Allow-Origin "${o.corsOrigin}"`, ...(o.corsOrigin === "*" ? [] : ['Header append Vary "Origin"']));
    section("Headers", ["<IfModule mod_headers.c>", ...h.map((l) => `    ${l}`), "</IfModule>"]);
    if (o.hsts && !o.forceHttps) notes.push("HSTS without an HTTPS redirect: browsers ignore the header over plain HTTP, and once cached it locks visitors out if HTTPS breaks.");
  }
  if (o.gzip) section("Compression", ["<IfModule mod_deflate.c>", "    AddOutputFilterByType DEFLATE text/html text/plain text/css text/xml application/javascript text/javascript application/json application/xml application/rss+xml image/svg+xml font/ttf font/otf application/vnd.ms-fontobject", "</IfModule>"]);
  if (o.cache) {
    const age = `"access plus ${o.cacheDays} days"`;
    section("Browser caching", ["<IfModule mod_expires.c>", "    ExpiresActive On", '    ExpiresDefault "access plus 1 day"', '    ExpiresByType text/html "access plus 0 seconds"',
      ...["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml", "image/x-icon", "text/css", "application/javascript", "text/javascript", "font/woff", "font/woff2"].map((t) => `    ExpiresByType ${t} ${age}`), "</IfModule>"]);
    if (o.cacheDays >= 30) notes.push(`CSS/JS are cached for ${o.cacheDays} days — only safe if file names change on every deploy (content hashes).`);
  }
  const out = (notes.length ? notes.map((n) => `# NOTE: ${n}`).join("\n") + "\n\n" : "") + L.join("\n") + "\n";
  return { output: L.length ? out : "", error: null };
}
