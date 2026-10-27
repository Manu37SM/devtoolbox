import { z } from "zod";

export const dataStorageConverterOptionsSchema = z.object({
  system: z.enum(["both", "decimal", "binary"]).default("both"),
});
export type DataStorageConverterOptions = z.infer<typeof dataStorageConverterOptionsSchema>;

export const dataStorageConverterInputSchema = z.string().max(1000000);
