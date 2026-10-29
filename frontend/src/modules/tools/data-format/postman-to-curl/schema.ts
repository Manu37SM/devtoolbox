import { z } from "zod";

export const postmanToCurlOptionsSchema = z.object({
  shell: z.enum(["bash", "powershell"]).default("bash"),
  variables: z.enum(["resolve", "env", "keep"]).default("resolve"),
  maskSecrets: z.boolean().default(false),
});
export type PostmanToCurlOptions = z.infer<typeof postmanToCurlOptionsSchema>;
