import { z } from "zod";

export const dockerRunToComposeOptionsSchema = z.object({

});
export type DockerRunToComposeOptions = z.infer<typeof dockerRunToComposeOptionsSchema>;

export const dockerRunToComposeInputSchema = z.string().max(1000000);
