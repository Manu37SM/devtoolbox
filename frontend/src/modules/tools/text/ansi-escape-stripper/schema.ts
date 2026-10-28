import { z } from "zod";

export const ansiEscapeStripperOptionsSchema = z.object({
  mode: z.enum(["strip", "html", "inspect"]).default("strip"),
  stripCarriageReturns: z.boolean().default(true),
});
export type AnsiEscapeStripperOptions = z.infer<typeof ansiEscapeStripperOptionsSchema>;
