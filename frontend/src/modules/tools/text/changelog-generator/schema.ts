import { z } from "zod";

export const changelogGeneratorOptionsSchema = z.object({
  currentVersion: z.string().default("1.4.2"),
  repoUrl: z.string().default(""),
  includeOther: z.boolean().default(false),
});
export type ChangelogGeneratorOptions = z.infer<typeof changelogGeneratorOptionsSchema>;
