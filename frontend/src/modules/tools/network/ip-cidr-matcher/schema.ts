import { z } from "zod";

export const ipCidrMatcherOptionsSchema = z.object({
  showAll: z.boolean().default(false),
});
export type IpCidrMatcherOptions = z.infer<typeof ipCidrMatcherOptionsSchema>;

export const ipCidrMatcherInputSchema = z.string().max(200_000);
