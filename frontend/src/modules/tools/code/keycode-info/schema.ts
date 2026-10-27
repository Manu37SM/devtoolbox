import { z } from "zod";

export const keycodeInfoOptionsSchema = z.object({

});
export type KeycodeInfoOptions = z.infer<typeof keycodeInfoOptionsSchema>;

export const keycodeInfoInputSchema = z.string().max(1000000);
