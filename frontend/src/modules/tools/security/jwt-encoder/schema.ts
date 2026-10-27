import { z } from "zod";

export const jwtEncoderOptionsSchema = z.object({
  algorithm: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),
  secret: z.string().max(10000).default("your-256-bit-secret"),
  keyId: z.string().max(10000).default(""),
  addIssuedAt: z.boolean().default(false),
  expiresIn: z.enum(["none", "15m", "1h", "24h", "7d", "30d"]).default("none"),
});
export type JwtEncoderOptions = z.infer<typeof jwtEncoderOptionsSchema>;

export const jwtEncoderInputSchema = z.string().max(1000000);
