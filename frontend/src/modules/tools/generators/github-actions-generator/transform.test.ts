import { describe, expect, it } from "vitest";
import { generateWorkflow } from "./transform";

const o = { stack: "node" as const, triggers: "push-pr" as const, branch: "main" as const, runner: "ubuntu-latest" as const, version: "", cache: true, matrix: false };

describe("generateWorkflow", () => {
  it("builds a node workflow", () => {
    const r = generateWorkflow("", o).output;
    expect(r).toContain("name: CI\n\non:\n  push:\n    branches: [main]\n  pull_request:");
    expect(r).toContain("permissions:\n  contents: read");
    expect(r).toContain('node-version: "20"');
    expect(r).toContain("cache: npm");
    expect(r).toContain("run: npm ci");
  });
  it("supports a version matrix", () => {
    const r = generateWorkflow("", { ...o, stack: "python", matrix: true }).output;
    expect(r).toContain('matrix:\n        version: ["3.11", "3.12"]');
    expect(r).toContain('python-version: "${{ matrix.version }}"');
  });
  it("covers other stacks and triggers", () => {
    expect(generateWorkflow("", { ...o, stack: "java-maven" }).output).toContain("run: mvn -B verify");
    expect(generateWorkflow("", { ...o, stack: "go", triggers: "manual" }).output).toContain("workflow_dispatch:");
    expect(generateWorkflow("", { ...o, stack: "docker", cache: true }).output).toContain("cache-from: type=gha");
    expect(generateWorkflow("", { ...o, stack: "rust", triggers: "schedule" }).output).toContain('cron: "0 3 * * 1"');
  });
  it("appends extra commands and quotes risky ones", () => {
    const r = generateWorkflow("npm run e2e\necho done: ok", o).output;
    expect(r).toContain("run: npm run e2e");
    expect(r).toContain('run: "echo done: ok"');
  });
  it("rejects odd versions", () => {
    expect(generateWorkflow("", { ...o, version: "20; rm -rf" }).error?.message).toMatch(/Versions/);
  });
});
