import { z } from "zod";

export const certificateDecoderInputSchema = z.string().max(20_000);
