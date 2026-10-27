import { z } from "zod";

export const httpStatusCodesOptionsSchema = z.object({
  compact: z.boolean().default(false),
});
export type HttpStatusCodesOptions = z.infer<typeof httpStatusCodesOptionsSchema>;

export const httpStatusCodesInputSchema = z.string().max(1000000);
