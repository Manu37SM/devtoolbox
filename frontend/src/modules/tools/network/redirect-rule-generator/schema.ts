import { z } from "zod";

export const redirectRuleGeneratorOptionsSchema = z.object({
  target: z.enum(["nginx", "apache", "netlify", "vercel", "caddy", "cloudflare"]).default("nginx"),
  defaultCode: z.enum(["301", "302", "307", "308"]).default("301"),
});
export type RedirectRuleGeneratorOptions = z.infer<typeof redirectRuleGeneratorOptionsSchema>;

export const redirectRuleGeneratorInputSchema = z.string().max(500_000);
