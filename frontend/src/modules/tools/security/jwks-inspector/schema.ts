import { z } from "zod";

export const jwksInspectorOptionsSchema = z.object({
  output: z.enum(["summary", "pem", "jwks"]).default("summary"),
});
export type JwksInspectorOptions = z.infer<typeof jwksInspectorOptionsSchema>;
