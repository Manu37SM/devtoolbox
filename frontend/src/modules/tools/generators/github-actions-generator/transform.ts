import type { TransformResult } from "@/lib/tool-transform";
import type { GithubActionsGeneratorOptions } from "./schema";

const DEFAULT_VERSIONS: Record<string, string[]> = { node: ["20", "22"], python: ["3.11", "3.12"], "java-maven": ["17", "21"], "java-gradle": ["17", "21"], go: ["1.22", "1.23"], rust: ["stable"], docker: [] };

/** Input: optional extra shell commands to run after the standard build/test steps (one per line). */
export function generateWorkflow(input: string, o: GithubActionsGeneratorOptions): TransformResult {
  const extra = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  const defaults = DEFAULT_VERSIONS[o.stack]!;
  const versions = o.version ? o.version.split(/[,\s]+/).filter(Boolean) : defaults;
  if (versions.some((x) => !/^[\w.-]+$/.test(x))) return { output: "", error: { message: "Versions may only contain letters, digits, dots, dashes and underscores" } };
  const useMatrix = o.matrix && o.stack !== "docker" && versions.length > 0;
  const ver = useMatrix ? "${{ matrix.version }}" : versions[0] ?? "";
  const on: string[] = [];
  if (o.triggers === "push-pr") on.push("  push:", `    branches: [${o.branch}]`, "  pull_request:", `    branches: [${o.branch}]`);
  else if (o.triggers === "push") on.push("  push:", `    branches: [${o.branch}]`);
  else if (o.triggers === "pr") on.push("  pull_request:", `    branches: [${o.branch}]`);
  else if (o.triggers === "schedule") on.push("  schedule:", "    - cron: \"0 3 * * 1\"");
  else on.push("  workflow_dispatch:");
  const steps: string[] = ["      - uses: actions/checkout@v4"];
  const run = (name: string, cmd: string) => steps.push(`      - name: ${name}`, `        run: ${cmd}`);
  const setup = (uses: string, withLines: string[]) => steps.push(`      - uses: ${uses}`, ...(withLines.length ? ["        with:", ...withLines.map((x) => `          ${x}`)] : []));
  switch (o.stack) {
    case "node": setup("actions/setup-node@v4", [`node-version: "${ver}"`, ...(o.cache ? ["cache: npm"] : [])]); run("Install", "npm ci"); run("Lint", "npm run lint --if-present"); run("Test", "npm test --if-present"); run("Build", "npm run build --if-present"); break;
    case "python": setup("actions/setup-python@v5", [`python-version: "${ver}"`, ...(o.cache ? ["cache: pip"] : [])]); run("Install", "pip install -r requirements.txt"); run("Test", "pytest"); break;
    case "java-maven": setup("actions/setup-java@v4", ["distribution: temurin", `java-version: "${ver}"`, ...(o.cache ? ["cache: maven"] : [])]); run("Build and test", "mvn -B verify"); break;
    case "java-gradle": setup("actions/setup-java@v4", ["distribution: temurin", `java-version: "${ver}"`, ...(o.cache ? ["cache: gradle"] : [])]); run("Build and test", "./gradlew build"); break;
    case "go": setup("actions/setup-go@v5", [`go-version: "${ver}"`, `cache: ${o.cache}`]); run("Vet", "go vet ./..."); run("Test", "go test ./..."); break;
    case "rust": setup("dtolnay/rust-toolchain@master", [`toolchain: ${ver}`]); if (o.cache) steps.push("      - uses: Swatinem/rust-cache@v2"); run("Build", "cargo build --locked"); run("Test", "cargo test --locked"); break;
    case "docker":
      steps.push("      - uses: docker/setup-buildx-action@v3", "      - uses: docker/build-push-action@v6", "        with:", "          context: .", "          push: false", ...(o.cache ? ["          cache-from: type=gha", "          cache-to: type=gha,mode=max"] : []));
      break;
  }
  for (const c of extra) run(c.length > 40 ? c.slice(0, 37) + "..." : c, c.includes(":") || c.includes("#") ? JSON.stringify(c) : c);
  const job = ["jobs:", "  build:", `    runs-on: ${o.runner}`];
  if (useMatrix) job.push("    strategy:", "      fail-fast: false", "      matrix:", `        version: [${versions.map((x) => JSON.stringify(x)).join(", ")}]`);
  const out = ["name: CI", "", "on:", ...on, "", "permissions:", "  contents: read", "", ...job, "    steps:", ...steps];
  return { output: out.join("\n") + "\n", error: null };
}
