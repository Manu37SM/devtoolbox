import { z } from "zod";

export const apacheVhostGeneratorOptionsSchema = z.object({
  /** What each site serves */
  siteType: z.enum(["static", "spa", "proxy", "php-fpm", "redirect"]).default("static"),
  /** {domain} is replaced by each site's primary name */
  docRoot: z.string().default("/var/www/{domain}/public"),
  tls: z.enum(["none", "redirect", "https-only"]).default("redirect"),
  /** Certificate paths; {domain} is replaced */
  certFile: z.string().default("/etc/letsencrypt/live/{domain}/fullchain.pem"),
  keyFile: z.string().default("/etc/letsencrypt/live/{domain}/privkey.pem"),
  tlsProfile: z.enum(["intermediate", "modern"]).default("intermediate"),
  http2: z.boolean().default(true),
  hsts: z.boolean().default(false),
  hstsDays: z.number().int().min(1).max(730).default(365),
  /** Backend for proxy sites */
  proxyTarget: z.string().default("http://127.0.0.1:3000"),
  websocket: z.boolean().default(false),
  /** PHP-FPM handler target, used by php-fpm sites */
  phpHandler: z.string().default("unix:/run/php/php8.3-fpm.sock"),
  /** Where to send redirect-only sites */
  redirectTo: z.string().default("https://example.com/"),
  wwwRedirect: z.enum(["none", "to-apex", "to-www"]).default("none"),
  securityHeaders: z.boolean().default(true),
  compression: z.boolean().default(true),
  staticCache: z.boolean().default(false),
  noIndexes: z.boolean().default(true),
  allowOverride: z.boolean().default(false),
  logDir: z.string().default("${APACHE_LOG_DIR}"),
  logFormat: z.enum(["combined", "common", "vhost_combined"]).default("combined"),
  serverAdmin: z.string().default(""),
  /** Upload size cap in MB, 0 for Apache's default (unlimited) */
  maxBodyMb: z.number().int().min(0).max(10240).default(0),
  /** Add a comment header listing a2enmod commands for the modules in use */
  moduleHints: z.boolean().default(true),
});
export type ApacheVhostGeneratorOptions = z.infer<typeof apacheVhostGeneratorOptionsSchema>;
