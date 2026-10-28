import { z } from "zod";

export const nginxConfigGeneratorOptionsSchema = z.object({
  kind: z.enum(["reverse-proxy", "static-site", "spa", "php-fpm", "https-redirect", "load-balancer"]).default("reverse-proxy"),
  ssl: z.boolean().default(true),
  hsts: z.boolean().default(true),
  gzip: z.boolean().default(true),
  websocket: z.boolean().default(false),
  securityHeaders: z.boolean().default(true),
});
export type NginxConfigGeneratorOptions = z.infer<typeof nginxConfigGeneratorOptionsSchema>;
