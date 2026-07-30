import { z } from "zod";

export const colorConverterInputSchema = z.string().max(64);
