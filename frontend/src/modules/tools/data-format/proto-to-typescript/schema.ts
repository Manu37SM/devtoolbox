import { z } from "zod";

export const protoToTypescriptOptionsSchema = z.object({
  output: z.enum(["typescript", "json"]).default("typescript"),
  enumStyle: z.enum(["union", "enum"]).default("union"),
  int64: z.enum(["string", "number"]).default("string"),
});
export type ProtoToTypescriptOptions = z.infer<typeof protoToTypescriptOptionsSchema>;
