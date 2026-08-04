import { z } from "zod";

export const jsonPathTesterOptionsSchema = z.object({
  expression: z.string().default("@"),
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type JsonPathTesterOptions = z.infer<typeof jsonPathTesterOptionsSchema>;

export const jsonPathTesterInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
