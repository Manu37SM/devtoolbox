import { z } from "zod";

export const soapEnvelopeBuilderOptionsSchema = z.object({
  mode: z.enum(["build", "fault", "parse"]).default("build"),
  version: z.enum(["1.1", "1.2"]).default("1.1"),
  /** target namespace URI of the operation */
  namespace: z.string().default("http://example.com/service"),
  prefix: z.string().default("ns"),
  /** qualified: children share the namespace (elementFormDefault=qualified) */
  childForm: z.enum(["unqualified", "qualified"]).default("unqualified"),
  soapAction: z.string().default(""),
  security: z.enum(["none", "text", "digest"]).default("none"),
  username: z.string().default(""),
  password: z.string().default(""),
  /** base64 nonce; blank = a fixed example nonce */
  nonce: z.string().default(""),
  /** xsd:dateTime; blank = now */
  created: z.string().default(""),
  mustUnderstand: z.boolean().default(true),
  /** extra header blocks as a JSON object */
  headers: z.string().default(""),
  indent: z.number().int().min(0).max(8).default(2),
  xmlDeclaration: z.boolean().default(true),
  output: z.enum(["envelope", "http", "curl"]).default("envelope"),
  endpoint: z.string().default("https://example.com/service"),
});
export type SoapEnvelopeBuilderOptions = z.infer<typeof soapEnvelopeBuilderOptionsSchema>;
