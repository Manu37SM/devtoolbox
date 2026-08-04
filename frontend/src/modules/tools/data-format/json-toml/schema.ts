import { z } from "zod";

export const jsonTomlOptionsSchema = z.object({
  mode: z.enum(["json-to-toml", "toml-to-json"]).default("json-to-toml"),
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
});
export type JsonTomlOptions = z.infer<typeof jsonTomlOptionsSchema>;

export const jsonTomlInputSchema = z.string().max(5_000_000, {
  message: "Input exceeds the 5MB client-side processing limit.",
});
