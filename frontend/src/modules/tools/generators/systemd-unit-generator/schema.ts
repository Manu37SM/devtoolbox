import { z } from "zod";

export const systemdUnitGeneratorOptionsSchema = z.object({
  type: z.enum(["simple", "exec", "forking", "oneshot", "notify"]).default("simple"),
  restart: z.enum(["no", "on-failure", "always", "on-abnormal"]).default("on-failure"),
  restartSec: z.number().int().min(0).max(3600).default(5),
  wantedBy: z.enum(["multi-user.target", "default.target", "graphical.target"]).default("multi-user.target"),
  afterNetwork: z.boolean().default(true),
  hardening: z.boolean().default(true),
});
export type SystemdUnitGeneratorOptions = z.infer<typeof systemdUnitGeneratorOptionsSchema>;
