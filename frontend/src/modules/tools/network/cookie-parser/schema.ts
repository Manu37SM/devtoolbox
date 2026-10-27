import { z } from "zod";

export const cookieParserOptionsSchema = z.object({
  mode: z.enum(["auto", "cookie", "set-cookie"]).default("auto"),
  decode: z.boolean().default(true),
});
export type CookieParserOptions = z.infer<typeof cookieParserOptionsSchema>;

export const cookieParserInputSchema = z.string().max(1000000);
