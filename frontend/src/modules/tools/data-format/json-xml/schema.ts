import { z } from "zod";

export const jsonXmlOptionsSchema = z.object({
  mode: z.enum(["json-to-xml", "xml-to-json"]).default("json-to-xml"),
  indent: z.union([z.literal(2), z.literal(4)]).default(2),
  rootName: z.string().min(1).max(100).default("root"),
  /** Prepend <?xml version="1.0" encoding="UTF-8"?> to generated XML. */
  xmlDeclaration: z.boolean().default(false),
  /** Prefix that marks attributes in the JSON form: "@_" (fast-xml-parser), "@" (BadgerFish), "-" (xml2json). */
  attributePrefix: z.enum(["@_", "@", "-"]).default("@_"),
  /** XML to JSON: turn "42", "3.5", "true", "false" into numbers and booleans. */
  coerceTypes: z.boolean().default(false),
});
export type JsonXmlOptions = z.infer<typeof jsonXmlOptionsSchema>;

export const jsonXmlInputSchema = z.string().max(5_000_000);
