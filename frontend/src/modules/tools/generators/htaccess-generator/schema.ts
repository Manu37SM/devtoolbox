import { z } from "zod";

export const htaccessGeneratorOptionsSchema = z.object({
  forceHttps: z.boolean().default(true),
  behindProxy: z.boolean().default(false),
  www: z.enum(["none", "to-www", "to-apex"]).default("none"),
  spa: z.boolean().default(false),
  noIndexes: z.boolean().default(true),
  blockDotfiles: z.boolean().default(true),
  securityHeaders: z.boolean().default(true),
  hsts: z.boolean().default(false),
  gzip: z.boolean().default(true),
  cache: z.boolean().default(true),
  cacheDays: z.number().int().min(1).max(3650).default(365),
  charset: z.boolean().default(true),
  errorPage404: z.string().default(""),
  hotlinkDomain: z.string().default(""),
  denyIps: z.string().default(""),
  corsOrigin: z.string().default(""),
  authRealm: z.string().default(""),
  authFile: z.string().default("/home/user/.htpasswd"),
});
export type HtaccessGeneratorOptions = z.infer<typeof htaccessGeneratorOptionsSchema>;
