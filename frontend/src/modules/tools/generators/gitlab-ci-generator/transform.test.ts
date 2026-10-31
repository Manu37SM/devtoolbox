import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { gitlabCiGenerator } from "./transform";
import type { GitlabCiGeneratorOptions } from "./schema";

type Doc = Record<string, unknown> & { stages: string[]; default?: Record<string, unknown>; workflow?: unknown; include?: unknown[]; variables?: Record<string, unknown> };
const RESERVED = new Set(["stages", "default", "workflow", "include", "variables", "image", "services", "cache", "before_script", "after_script"]);

function gen(o: Partial<GitlabCiGeneratorOptions>): { text: string; doc: Doc; jobs: [string, Record<string, unknown>][] } {
  const r = gitlabCiGenerator("", o);
  expect(r.error).toBeNull();
  const doc = load(r.output) as Doc;
  const jobs = Object.entries(doc).filter(([k]) => !RESERVED.has(k) && !k.startsWith(".")) as [string, Record<string, unknown>][];
  return { text: r.output, doc, jobs };
}

/** The structural rules GitLab enforces when it lints a pipeline. */
function lint({ doc, jobs }: ReturnType<typeof gen>): string[] {
  const problems: string[] = [];
  const stages = new Set(doc.stages);
  const usesSast = (doc.include ?? []).length > 0;
  for (const [name, job] of jobs) {
    const stage = (job.stage as string | undefined) ?? "test";
    if (!stages.has(stage)) problems.push(`${name}: stage "${stage}" is not in stages`);
    if (!job.script && !job.trigger) problems.push(`${name}: no script`);
    for (const n of (job.needs as string[] | undefined) ?? []) if (!jobs.some(([j]) => j === n)) problems.push(`${name}: needs unknown job ${n}`);
  }
  if (usesSast && !stages.has("test")) problems.push("SAST templates need a test stage");
  const stageUsed = (s: string) => jobs.some(([, j]) => ((j.stage as string | undefined) ?? "test") === s) || (s === "test" && usesSast);
  for (const s of doc.stages) if (!stageUsed(s)) problems.push(`stage "${s}" has no jobs`);
  return problems;
}

const STACKS = ["node", "java-maven", "java-gradle", "python", "go", "docker-only"] as const;

describe("gitlabCiGenerator", () => {
  it.each(STACKS)("%s: full pipeline passes the structural lint", (stack) => {
    const g = gen({ stack, stages: ["lint", "test", "build", "docker", "deploy"], deploy: "ssh", sast: true, services: ["postgres", "redis"], coverage: true, retry: 2, timeoutMinutes: 30 });
    expect(lint(g)).toEqual([]);
  });
  it.each(["none", "ssh", "kubectl", "pages"] as const)("deploy %s lints", (deploy) => {
    expect(lint(gen({ deploy, stages: ["test", "build"] }))).toEqual([]);
  });
  it("runs the right commands per stack", () => {
    expect(gen({ stack: "node" }).text).toContain("npm ci --cache .npm --prefer-offline");
    expect(gen({ stack: "node", packageManager: "pnpm" }).text).toContain("pnpm install --frozen-lockfile");
    expect(gen({ stack: "node", packageManager: "yarn" }).text).toContain("yarn install --frozen-lockfile");
    expect(gen({ stack: "java-maven", version: "17" }).doc.default!.image).toBe("maven:3.9-eclipse-temurin-17");
    expect(gen({ stack: "go" }).text).toContain("go test -race -cover ./...");
    expect(gen({ stack: "python", version: "3.11" }).doc.default!.image).toBe("python:3.11-slim");
  });
  it("keys the cache on the lockfile", () => {
    expect(gen({ stack: "node" }).doc.default!.cache).toMatchObject({ key: { files: ["package-lock.json"] }, paths: [".npm/"] });
    expect(gen({ cache: false }).doc.default!.cache).toBeUndefined();
  });
  it("attaches services with aliases and their variables", () => {
    const g = gen({ services: ["postgres"] });
    expect((g.doc.test as { services: unknown[] }).services).toEqual([{ name: "postgres:16-alpine", alias: "postgres" }]);
    expect(g.doc.variables).toMatchObject({ POSTGRES_DB: "test" });
  });
  it("avoids duplicate pipelines with workflow rules, or omits them", () => {
    expect(JSON.stringify(gen({ mrPipelines: true }).doc.workflow)).toContain("$CI_OPEN_MERGE_REQUESTS");
    expect(gen({ mrPipelines: false }).doc.workflow).toBeUndefined();
  });
  it("docker job builds and pushes to the registry, or only builds", () => {
    expect(gen({ stages: ["docker"], dockerPush: true }).text).toContain("docker push $CI_REGISTRY_IMAGE:latest");
    expect(gen({ stages: ["docker"], dockerPush: false }).text).not.toContain("docker push");
  });
  it("manual deploy is gated to the default branch", () => {
    const d = gen({ deploy: "kubectl", manualDeploy: true }).doc.deploy as { rules: { when: string }[]; environment: { name: string } };
    expect(d.rules[0]!.when).toBe("manual");
    expect(d.environment.name).toBe("production");
    expect((gen({ deploy: "ssh", manualDeploy: false }).doc.deploy as { rules: { when: string }[] }).rules[0]!.when).toBe("on_success");
  });
  it("applies retry, interruptible and timeout defaults", () => {
    const d = gen({ retry: 1, timeoutMinutes: 15 }).doc.default!;
    expect(d.retry).toMatchObject({ max: 1 });
    expect(d.timeout).toBe("15m");
    expect(d.interruptible).toBe(true);
  });
  it("adds SAST templates and forces a test stage", () => {
    const g = gen({ stages: ["build"], sast: true });
    expect(g.doc.stages).toContain("test");
    expect(g.doc.include).toHaveLength(2);
  });
  it("validates inputs", () => {
    expect(gitlabCiGenerator("", { version: "1; rm -rf" }).error).not.toBeNull();
    expect(gitlabCiGenerator("", { environmentName: "a b" }).error).not.toBeNull();
    expect(gitlabCiGenerator("", { stages: [] }).error?.message).toMatch(/at least one stage/);
  });
});
