import { z } from "zod";

export const mavenPomGeneratorOptionsSchema = z.object({
  type: z.enum(["spring-boot", "plain-jar", "library"]).default("spring-boot"),
  javaVersion: z.enum(["17", "21", "25"]).default("21"),
  packaging: z.enum(["jar", "war", "pom"]).default("jar"),
});
export type MavenPomGeneratorOptions = z.infer<typeof mavenPomGeneratorOptionsSchema>;
