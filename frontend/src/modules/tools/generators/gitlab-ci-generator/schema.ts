import { z } from "zod";

export const gitlabCiGeneratorOptionsSchema = z.object({
  stack: z.enum(["node", "java-maven", "java-gradle", "python", "go", "docker-only"]).default("node"),
  /** Runtime version, e.g. 22, 21, 3.12, 1.23 ("" = a sensible default) */
  version: z.string().max(20).default(""),
  packageManager: z.enum(["npm", "yarn", "pnpm"]).default("npm"),
  stages: z.array(z.enum(["lint", "test", "build", "docker", "deploy"])).default(["lint", "test", "build"]),
  services: z.array(z.enum(["postgres", "mysql", "redis", "mongo"])).default([]),
  cache: z.boolean().default(true),
  artifacts: z.boolean().default(true),
  /** Run pipelines for merge requests and the default branch only (avoids duplicate pipelines) */
  mrPipelines: z.boolean().default(true),
  /** docker stage: build and push to the project container registry */
  dockerPush: z.boolean().default(true),
  deploy: z.enum(["none", "ssh", "kubectl", "pages"]).default("none"),
  /** Deploy jobs wait for a click */
  manualDeploy: z.boolean().default(true),
  environmentName: z.string().max(40).default("production"),
  coverage: z.boolean().default(false),
  retry: z.number().int().min(0).max(2).default(0),
  interruptible: z.boolean().default(true),
  timeoutMinutes: z.number().int().min(0).max(1440).default(0),
  /** Include GitLab's SAST and Secret Detection templates (they run in the test stage) */
  sast: z.boolean().default(false),
});
export type GitlabCiGeneratorOptions = z.infer<typeof gitlabCiGeneratorOptionsSchema>;
