import { z } from "zod";

export const userAgentParserOptionsSchema = z.object({
  uaString: z.string().default(""),
});
export type UserAgentParserOptions = z.infer<typeof userAgentParserOptionsSchema>;
