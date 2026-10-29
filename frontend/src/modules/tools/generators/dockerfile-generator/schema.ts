import { z } from "zod";

export const dockerfileGeneratorOptionsSchema = z.object({
  stack: z.enum(["spring-boot-maven", "spring-boot-gradle", "node", "nextjs", "python", "go", "spa-nginx"]).default("spring-boot-maven"),
  base: z.enum(["standard", "alpine", "distroless"]).default("standard"),
  includeDockerignore: z.boolean().default(true),
});
export type DockerfileGeneratorOptions = z.infer<typeof dockerfileGeneratorOptionsSchema>;
