import { z } from "zod";

export const jwtDecoderOptionsSchema = z.object({
  // Signature verification is opt-in and always client-side: the user
  // supplies the key themselves (FEATURE.md Module 2 note).
  verifySecret: z.string().optional(),
});
export type JwtDecoderOptions = z.infer<typeof jwtDecoderOptionsSchema>;

export const jwtDecoderInputSchema = z.string().max(50_000);
