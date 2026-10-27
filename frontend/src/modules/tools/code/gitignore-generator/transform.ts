import type { TransformResult } from "@/lib/tool-transform";
import type { GitignoreGeneratorOptions } from "./schema";
import { GITIGNORE_TEMPLATES } from "./templates";

export const GITIGNORE_NAMES = Object.keys(GITIGNORE_TEMPLATES);

const ALIASES: Record<string, string> = {
  js: "node", javascript: "node", typescript: "node", ts: "node", npm: "node", yarn: "node",
  idea: "intellij", webstorm: "intellij", pycharm: "intellij", "jetbrains": "intellij",
  py: "python", "c#": "dotnet", csharp: "dotnet", ".net": "dotnet", golang: "go",
  mac: "macos", osx: "macos", win: "windows", springboot: "spring", "spring-boot": "spring",
  dotenv: "env", cra: "react", next: "nextjs", "next.js": "nextjs", tf: "terraform", vs: "vscode",
};

export function generateGitignore(input: string, options: GitignoreGeneratorOptions): TransformResult {
  const names = input.split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (names.length === 0) return { output: "", error: null };

  const resolved: string[] = [];
  const unknown: string[] = [];
  for (const n of names) {
    const key = GITIGNORE_TEMPLATES[n] ? n : ALIASES[n];
    if (!key) unknown.push(n);
    else if (!resolved.includes(key)) resolved.push(key);
  }
  if (unknown.length) {
    return { output: "", error: { message: `Unknown template${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.\nAvailable: ${GITIGNORE_NAMES.join(", ")}` } };
  }

  const seen = new Set<string>();
  const sections = resolved.map((key) => {
    const t = GITIGNORE_TEMPLATES[key]!;
    const lines = options.dedupe ? t.patterns.filter((p) => !seen.has(p) && (seen.add(p), true)) : t.patterns;
    return `# ${t.label}\n${lines.join("\n")}`;
  });
  return { output: sections.join("\n\n") + "\n", error: null };
}
