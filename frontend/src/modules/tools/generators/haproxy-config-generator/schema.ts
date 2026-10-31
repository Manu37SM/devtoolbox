import { z } from "zod";

export const haproxyConfigGeneratorOptionsSchema = z.object({
  mode: z.enum(["http", "tcp"]).default("http"),
  balance: z.enum(["roundrobin", "leastconn", "source", "uri", "first", "random"]).default("roundrobin"),
  healthPath: z.string().default("/"),
  tls: z.boolean().default(false),
  certPath: z.string().default("/etc/haproxy/certs/site.pem"),
  redirectHttps: z.boolean().default(true),
  http2: z.boolean().default(true),
  hsts: z.boolean().default(false),
  sticky: z.boolean().default(false),
  forwardHeaders: z.boolean().default(true),
  rateLimit: z.number().int().min(0).max(100000).default(0),
  maxconn: z.number().int().min(1).max(1000000).default(4096),
  timeoutClient: z.string().default("30s"),
  timeoutServer: z.string().default("30s"),
  timeoutConnect: z.string().default("5s"),
  stats: z.boolean().default(false),
  statsPort: z.number().int().min(1).max(65535).default(8404),
  statsAuth: z.string().default(""),
});
export type HaproxyConfigGeneratorOptions = z.infer<typeof haproxyConfigGeneratorOptionsSchema>;
