import { z } from "zod";

export const jwtDecoderOptionsSchema = z.object({

  verifySecret: z.string().optional(),
});
export type JwtDecoderOptions = z.infer<typeof jwtDecoderOptionsSchema>;

export const jwtDecoderInputSchema = z.string().max(50_000);
