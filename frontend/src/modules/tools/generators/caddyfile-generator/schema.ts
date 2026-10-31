import { z } from "zod";

export const caddyfileGeneratorOptionsSchema = z.object({
  /** ACME account e-mail (global option); empty = none */
  email: z.string().max(100).default(""),
  encode: z.enum(["none", "gzip", "zstd", "both"]).default("both"),
  securityHeaders: z.boolean().default(true),
  hsts: z.boolean().default(false),
  /** Static sites: send index.html for unknown paths (single-page apps) */
  spa: z.boolean().default(false),
  fileBrowse: z.boolean().default(false),
  lbPolicy: z.enum(["round_robin", "least_conn", "random", "ip_hash", "first"]).default("round_robin"),
  /** Reverse proxy health check path, e.g. /health ("" = off) */
  healthPath: z.string().max(100).default(""),
  /** Add a redirect from www.<site> to <site> (or the reverse) */
  wwwRedirect: z.enum(["none", "to-apex", "to-www"]).default("none"),
  log: z.enum(["none", "stdout", "file"]).default("none"),
  /** Use Caddy's internal CA instead of Let's Encrypt (local development) */
  tlsInternal: z.boolean().default(false),
  /** Maximum request body, e.g. 10MB ("" = unlimited) */
  maxBody: z.string().max(10).default(""),
  /** Turn off the admin API endpoint (hardening) */
  adminOff: z.boolean().default(false),
  http3: z.boolean().default(true),
});
export type CaddyfileGeneratorOptions = z.infer<typeof caddyfileGeneratorOptionsSchema>;
