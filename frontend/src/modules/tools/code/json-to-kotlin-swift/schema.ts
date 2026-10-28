import { z } from "zod";

export const jsonToKotlinSwiftOptionsSchema = z.object({
  target: z.enum(["kotlin-serialization", "kotlin-jackson", "kotlin-plain", "swift-codable"]).default("kotlin-serialization"),
  optionalDefaults: z.boolean().default(true),
});
export type JsonToKotlinSwiftOptions = z.infer<typeof jsonToKotlinSwiftOptionsSchema>;
