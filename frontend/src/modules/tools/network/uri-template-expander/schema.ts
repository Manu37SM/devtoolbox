import { z } from "zod";

export const uriTemplateExpanderOptionsSchema = z.object({
  /** expand: fill the templates; variables: list what each expression needs; check: validate only */
  action: z.enum(["expand", "variables", "check"]).default("expand"),
  /** JSON object with the values, e.g. {"id": 42, "tags": ["a","b"]} */
  variables: z.string().default(""),
  /** Show a line per expression explaining operator, modifiers and value used */
  explain: z.boolean().default(false),
  /** Keep the template and the result on one line, separated by an arrow */
  showTemplate: z.boolean().default(false),
});
export type UriTemplateExpanderOptions = z.infer<typeof uriTemplateExpanderOptionsSchema>;
