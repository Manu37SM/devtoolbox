import { z } from "zod";

export const sudoersGeneratorOptionsSchema = z.object({
  host: z.string().default("ALL"),
  runAs: z.string().default("ALL"),
  noPasswd: z.boolean().default(false),
  noExec: z.boolean().default(true),
  setEnv: z.boolean().default(false),
  logOutput: z.boolean().default(false),
  /** Group each rule's commands into a Cmnd_Alias */
  useAliases: z.boolean().default(false),
  /** -1 = leave sudo's default (usually 5 minutes) */
  timestampTimeout: z.number().int().min(-1).max(1440).default(-1),
  logfile: z.string().default(""),
  header: z.boolean().default(true),
});
export type SudoersGeneratorOptions = z.infer<typeof sudoersGeneratorOptionsSchema>;
