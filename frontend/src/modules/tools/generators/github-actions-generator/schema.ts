import { z } from "zod";

export const githubActionsGeneratorOptionsSchema = z.object({
  stack: z.enum(["node", "python", "java-maven", "java-gradle", "go", "rust", "docker"]).default("node"),
  triggers: z.enum(["push-pr", "push", "pr", "schedule", "manual"]).default("push-pr"),
  branch: z.enum(["main", "master"]).default("main"),
  runner: z.enum(["ubuntu-latest", "windows-latest", "macos-latest"]).default("ubuntu-latest"),
  version: z.string().default(""),
  cache: z.boolean().default(true),
  matrix: z.boolean().default(false),
});
export type GithubActionsGeneratorOptions = z.infer<typeof githubActionsGeneratorOptionsSchema>;
