import { z } from "zod";

export const htpasswdGeneratorOptionsSchema = z.object({
  algorithm: z.enum(["apr1", "sha1"]).default("apr1"),
});
export type HtpasswdGeneratorOptions = z.infer<typeof htpasswdGeneratorOptionsSchema>;
