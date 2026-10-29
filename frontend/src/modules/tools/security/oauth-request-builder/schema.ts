import { z } from "zod";

export const oauthRequestBuilderOptionsSchema = z.object({
  flow: z.enum(["authorization-code", "client-credentials", "refresh-token", "device-code", "password", "callback"]).default("authorization-code"),
  clientAuth: z.enum(["basic", "post", "none"]).default("basic"),
});
export type OauthRequestBuilderOptions = z.infer<typeof oauthRequestBuilderOptionsSchema>;
