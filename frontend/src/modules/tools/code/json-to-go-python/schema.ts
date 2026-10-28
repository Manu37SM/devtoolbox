import { z } from "zod";

export const jsonToGoPythonOptionsSchema = z.object({
  target: z.enum(["go", "python-dataclass", "python-pydantic", "python-typeddict"]).default("go"),
  omitEmpty: z.boolean().default(true),
  pointerForNullable: z.boolean().default(true),
});
export type JsonToGoPythonOptions = z.infer<typeof jsonToGoPythonOptionsSchema>;
