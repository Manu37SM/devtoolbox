import { z } from "zod";

export const logbackConfigGeneratorOptionsSchema = z.object({
  framework: z.enum(["logback", "log4j2", "spring-properties"]).default("logback"),
  format: z.enum(["pattern", "json-ecs", "json-logstash", "profile-split"]).default("profile-split"),
  rollingFile: z.boolean().default(true),
  async: z.boolean().default(true),
});
export type LogbackConfigGeneratorOptions = z.infer<typeof logbackConfigGeneratorOptionsSchema>;
