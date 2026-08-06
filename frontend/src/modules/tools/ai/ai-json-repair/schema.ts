import { z } from "zod";

export const aiJsonRepairOptionsSchema = z.object({
  input: z.string().min(1).max(20_000),
});
export type AiJsonRepairOptions = z.infer<typeof aiJsonRepairOptionsSchema>;
