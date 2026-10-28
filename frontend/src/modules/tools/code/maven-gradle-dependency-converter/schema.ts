import { z } from "zod";

export const mavenGradleDependencyConverterOptionsSchema = z.object({
  direction: z.enum(["maven-to-gradle", "gradle-to-maven"]).default("maven-to-gradle"),
  dsl: z.enum(["groovy", "kotlin"]).default("groovy"),
  includeExclusions: z.boolean().default(true),
});
export type MavenGradleDependencyConverterOptions = z.infer<typeof mavenGradleDependencyConverterOptionsSchema>;
