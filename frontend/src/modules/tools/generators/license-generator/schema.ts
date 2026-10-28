import { z } from "zod";

export const licenseGeneratorOptionsSchema = z.object({
  license: z.enum(["mit", "isc", "bsd-2", "bsd-3", "unlicense", "apache-2"]).default("mit"),
  output: z.enum(["file", "header"]).default("file"),
  comment: z.enum(["block", "line", "hash", "none"]).default("block"),
});
export type LicenseGeneratorOptions = z.infer<typeof licenseGeneratorOptionsSchema>;

export const licenseGeneratorInputSchema = z.string().max(2_000);
