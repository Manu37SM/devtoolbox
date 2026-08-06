import { z } from "zod";
import { AiExplainSubjects } from "@devtoolbox/shared";

export const explainThisOptionsSchema = z.object({
  subject: z.enum(AiExplainSubjects),
  input: z.string().min(1).max(4_000),
});
export type ExplainThisOptions = z.infer<typeof explainThisOptionsSchema>;
