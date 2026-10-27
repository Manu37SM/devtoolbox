import { z } from "zod";

export const ipv4RangeExpanderOptionsSchema = z.object({
  showUsable: z.boolean().default(true),
});
export type Ipv4RangeExpanderOptions = z.infer<typeof ipv4RangeExpanderOptionsSchema>;

export const ipv4RangeExpanderInputSchema = z.string().max(1000000);
