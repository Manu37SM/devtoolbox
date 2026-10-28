import { z } from "zod";

export const dockerfileLinterOptionsSchema = z.object({
  minSeverity: z.enum(["info", "warning", "error"]).default("info"),
});
export type DockerfileLinterOptions = z.infer<typeof dockerfileLinterOptionsSchema>;

export const dockerfileLinterInputSchema = z.string().max(500_000);
