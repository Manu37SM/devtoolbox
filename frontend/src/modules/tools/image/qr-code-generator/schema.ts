import { z } from "zod";

export const qrErrorCorrectionSchema = z.enum(["L", "M", "Q", "H"]);
export type QrErrorCorrection = z.infer<typeof qrErrorCorrectionSchema>;

export const qrCodeGeneratorOptionsSchema = z.object({
  errorCorrectionLevel: qrErrorCorrectionSchema.default("M"),
  margin: z.number().int().min(0).max(10).default(2),
  scale: z.number().int().min(1).max(20).default(6),
  darkColor: z.string().default("#000000"),
  lightColor: z.string().default("#ffffff"),
});
export type QrCodeGeneratorOptions = z.infer<typeof qrCodeGeneratorOptionsSchema>;

export const qrCodeGeneratorInputSchema = z.string().max(4_000);
