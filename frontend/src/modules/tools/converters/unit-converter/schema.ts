import { z } from "zod";

export const unitConverterOptionsSchema = z.object({
  category: z.enum(["data", "time", "length", "weight"]).default("data"),
  fromUnit: z.string().default("MB"),
  toUnit: z.string().default("GB"),
  dataBase: z.enum(["1000", "1024"]).default("1024"),
});
export type UnitConverterOptions = z.infer<typeof unitConverterOptionsSchema>;
