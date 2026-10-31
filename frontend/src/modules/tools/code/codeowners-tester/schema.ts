import { z } from "zod";

export const codeownersTesterOptionsSchema = z.object({
  flavor: z.enum(["github", "gitlab"]).default("github"),
  /** path: one row per path; owner: group the paths by owner */
  view: z.enum(["path", "owner"]).default("path"),
  lint: z.boolean().default(true),
  /** also list every rule with how many of the given paths it wins / loses */
  ruleUsage: z.boolean().default(false),
  caseInsensitive: z.boolean().default(false),
  format: z.enum(["table", "json"]).default("table"),
});
export type CodeownersTesterOptions = z.infer<typeof codeownersTesterOptionsSchema>;
