import { z } from "zod";

export const tlsCipherSuiteLookupOptionsSchema = z.object({
  sort: z.enum(["input", "rating"]).default("input"),
});
export type TlsCipherSuiteLookupOptions = z.infer<typeof tlsCipherSuiteLookupOptionsSchema>;
