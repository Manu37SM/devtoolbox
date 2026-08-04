import { z } from "zod";

export const jsonToTypesOptionsSchema = z.object({
  language: z.enum(["typescript", "go", "python"]).default("typescript"),
  rootName: z.string().default("Root"),
});
export type JsonToTypesOptions = z.infer<typeof jsonToTypesOptionsSchema>;

export const jsonToTypesInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
