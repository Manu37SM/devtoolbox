import { z } from "zod";

export const makefileGeneratorOptionsSchema = z.object({
  preset: z.enum(["none", "node", "python", "go", "maven", "docker", "c"]).default("none"),
  shell: z.enum(["default", "bash-strict", "sh"]).default("bash-strict"),
  help: z.boolean().default(true),
  phony: z.enum(["all", "auto", "none"]).default("auto"),
  silent: z.boolean().default(false),
  deleteOnError: z.boolean().default(true),
  noBuiltinRules: z.boolean().default(true),
  /** $VAR and $1 in recipes become $$VAR so the shell sees them; $(X) and ${X} stay make variables */
  escapeDollar: z.boolean().default(true),
  defaultGoal: z.string().default(""),
});
export type MakefileGeneratorOptions = z.infer<typeof makefileGeneratorOptionsSchema>;
