import { z } from "zod";

export const conventionalCommitLinterOptionsSchema = z.object({
  maxHeader: z.number().int().min(20).max(200).default(72),
  strictTypes: z.boolean().default(true),
});
export type ConventionalCommitLinterOptions = z.infer<typeof conventionalCommitLinterOptionsSchema>;

export const conventionalCommitLinterInputSchema = z.string().max(100_000);
