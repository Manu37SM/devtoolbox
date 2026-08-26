import { z } from "zod";

export const cssTailwindDirectionSchema = z.enum(["css-to-tailwind", "tailwind-to-css"]);
export type CssTailwindDirection = z.infer<typeof cssTailwindDirectionSchema>;

export const cssTailwindHelperInputSchema = z.string().max(10_000);
