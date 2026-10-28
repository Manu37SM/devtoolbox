import { z } from "zod";

export const hexDumpViewerOptionsSchema = z.object({
  direction: z.enum(["dump", "parse"]).default("dump"),
  inputFormat: z.enum(["text", "hex"]).default("text"),
  bytesPerLine: z.number().int().min(4).max(64).default(16),
  uppercase: z.boolean().default(false),
});
export type HexDumpViewerOptions = z.infer<typeof hexDumpViewerOptionsSchema>;

export const hexDumpViewerInputSchema = z.string().max(2_000_000);
