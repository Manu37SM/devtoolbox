import { z } from "zod";

export const checksumCalculatorOptionsSchema = z.object({
  algorithm: z.enum(["all", "crc32", "crc32c", "adler32", "crc16", "fletcher16"]).default("all"),
  inputFormat: z.enum(["text", "hex"]).default("text"),
});
export type ChecksumCalculatorOptions = z.infer<typeof checksumCalculatorOptionsSchema>;

export const checksumCalculatorInputSchema = z.string().max(1000000);
