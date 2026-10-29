import { z } from "zod";

export const jvmFlagsExplainerOptionsSchema = z.object({
  javaVersion: z.enum(["8", "11", "17", "21", "25"]).default("21"),
  showSystemProperties: z.boolean().default(true),
});
export type JvmFlagsExplainerOptions = z.infer<typeof jvmFlagsExplainerOptionsSchema>;
