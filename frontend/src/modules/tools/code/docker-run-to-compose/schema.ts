import { z } from "zod";

export const dockerRunToComposeOptionsSchema = z.object({
  /** Service key; empty uses --name or the image name. Ignored when several commands are converted. */
  serviceName: z.string().max(63).default(""),
  /** list = "- KEY=value" (docker run style); map = "KEY: value". */
  envStyle: z.enum(["list", "map"]).default("list"),
  /**
   * Replace values of secret-looking variables (PASSWORD, SECRET, TOKEN, KEY…) with ${VAR}
   * references and list them for a .env file, so the compose file can be committed.
   */
  extractSecrets: z.boolean().default(false),
  /** Keep container_name (it stops `docker compose up --scale` working). */
  containerName: z.boolean().default(true),
  /** Mark user-defined networks as external (created outside this compose file). */
  externalNetworks: z.boolean().default(true),
});
export type DockerRunToComposeOptions = z.infer<typeof dockerRunToComposeOptionsSchema>;

export const dockerRunToComposeInputSchema = z.string().max(1000000);
