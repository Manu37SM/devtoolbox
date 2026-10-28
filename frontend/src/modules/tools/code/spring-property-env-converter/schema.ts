import { z } from "zod";

export const springPropertyEnvConverterOptionsSchema = z.object({
  direction: z.enum(["to-env", "from-env"]).default("to-env"),
  format: z.enum(["dotenv", "export", "docker-compose", "kubernetes", "jvm"]).default("dotenv"),
  includeValues: z.boolean().default(true),
});
export type SpringPropertyEnvConverterOptions = z.infer<typeof springPropertyEnvConverterOptionsSchema>;
