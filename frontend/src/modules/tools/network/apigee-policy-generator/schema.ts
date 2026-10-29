import { z } from "zod";

export const apigeePolicyGeneratorOptionsSchema = z.object({
  policy: z.enum(["spike-arrest", "quota", "verify-api-key", "oauth-verify", "assign-message", "raise-fault", "cors", "json-threat-protection", "access-control", "response-cache", "kvm-get", "extract-variables", "basic-auth-decode", "javascript"]).default("spike-arrest"),
});
export type ApigeePolicyGeneratorOptions = z.infer<typeof apigeePolicyGeneratorOptionsSchema>;
