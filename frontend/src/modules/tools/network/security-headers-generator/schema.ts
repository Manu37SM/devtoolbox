import { z } from "zod";

export const securityHeadersGeneratorOptionsSchema = z.object({
  target: z.enum(["nginx", "apache", "express", "spring-security", "kong", "apigee", "iis", "caddy", "netlify", "vercel"]).default("nginx"),
});
export type SecurityHeadersGeneratorOptions = z.infer<typeof securityHeadersGeneratorOptionsSchema>;
