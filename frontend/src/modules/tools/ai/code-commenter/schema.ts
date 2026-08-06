import { z } from "zod";

export const codeCommenterOptionsSchema = z.object({
  code: z.string().min(1).max(10_000),
  language: z.string().min(1).max(40).optional(),
});
export type CodeCommenterOptions = z.infer<typeof codeCommenterOptionsSchema>;
