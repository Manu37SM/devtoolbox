import { z } from "zod";

export const stringCounterInputSchema = z.string().max(10_000_000);
