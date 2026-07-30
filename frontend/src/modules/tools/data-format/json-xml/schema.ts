import { z } from "zod";

export const jsonXmlOptionsSchema = z.object({
  mode: z.enum(["json-to-xml", "xml-to-json"]).default("json-to-xml"),
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  rootName: z.string().min(1).max(100).default("root"),
});
export type JsonXmlOptions = z.infer<typeof jsonXmlOptionsSchema>;

export const jsonXmlInputSchema = z.string().max(5_000_000);
