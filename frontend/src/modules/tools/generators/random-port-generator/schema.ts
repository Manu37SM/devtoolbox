import { z } from "zod";

export const randomPortGeneratorOptionsSchema = z.object({
  range: z.enum(["registered", "dynamic", "any", "custom"]).default("registered"),
  min: z.number().int().min(1).max(65535).default(1024),
  max: z.number().int().min(1).max(65535).default(65535),
  count: z.number().int().min(1).max(100).default(5),
  avoidCommon: z.boolean().default(true),
  sorted: z.boolean().default(true),
});
export type RandomPortGeneratorOptions = z.infer<typeof randomPortGeneratorOptionsSchema>;

export const randomPortGeneratorInputSchema = z.string().max(1000000);
