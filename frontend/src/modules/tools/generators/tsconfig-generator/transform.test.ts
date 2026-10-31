import ts from "typescript";
import { describe, expect, it } from "vitest";
import { tsconfigGenerator } from "./transform";

const PRESETS = ["node-app", "node-library", "library-esm", "browser", "react-vite", "nextjs", "angular-like", "bun-deno-style"] as const;
const STRICT = ["loose", "strict", "strictest"] as const;
const MODULES = ["auto", "ESNext", "NodeNext", "CommonJS", "Preserve"] as const;
const TARGETS = ["auto", "ES2017", "ES2019", "ES2020", "ES2021", "ES2022", "ES2023", "ESNext"] as const;

/** Parse with the real TypeScript compiler and return its option diagnostics. */
function diagnose(text: string): string[] {
  const parsed = ts.parseConfigFileTextToJson("tsconfig.json", text);
  if (parsed.error) return [ts.flattenDiagnosticMessageText(parsed.error.messageText, "\n")];
  const cfg = ts.parseJsonConfigFileContent(parsed.config, ts.sys, "/nonexistent-project", undefined, "/nonexistent-project/tsconfig.json");
  const program = ts.createProgram({ rootNames: [], options: cfg.options });
  return [...cfg.errors, ...program.getOptionsDiagnostics(), ...program.getGlobalDiagnostics()]
    .filter((d) => d.code !== 18003) // "No inputs were found" — the project folder does not exist here
    .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
}

describe("tsconfigGenerator", () => {
  it.each(PRESETS.flatMap((p) => STRICT.flatMap((s) => MODULES.map((m) => [p, s, m] as const))))("%s / %s / module %s is accepted by tsc", (preset, strictness, module) => {
    const out = tsconfigGenerator("", { preset, strictness, module, pathAlias: "@/*", declaration: true, incremental: true, allowJs: true, resolveJsonModule: true }).output;
    expect(diagnose(out)).toEqual([]);
  });

  it("produces valid output for every target and with comments off", () => {
    for (const target of TARGETS) {
      expect(diagnose(tsconfigGenerator("", { target, comments: false }).output)).toEqual([]);
    }
  });

  it("node-app defaults match what tsc resolves", () => {
    const out = tsconfigGenerator("", {}).output;
    const cfg = ts.parseJsonConfigFileContent(ts.parseConfigFileTextToJson("t.json", out).config, ts.sys, "/x");
    expect(cfg.options.module).toBe(ts.ModuleKind.NodeNext);
    expect(cfg.options.strict).toBe(true);
    expect(cfg.options.target).toBe(ts.ScriptTarget.ES2022);
    expect(cfg.options.outDir).toBe("/x/dist");
  });

  it("strictest adds the extra checks and loose turns strict off", () => {
    const strictest = tsconfigGenerator("", { strictness: "strictest" }).output;
    for (const k of ["noUncheckedIndexedAccess", "exactOptionalPropertyTypes", "noImplicitOverride"]) expect(strictest).toContain(`"${k}": true`);
    expect(tsconfigGenerator("", { strictness: "loose" }).output).toContain('"strict": false');
  });

  it("writes a path alias relative to the source root", () => {
    const out = tsconfigGenerator("", { pathAlias: "@/*", rootDir: "src" }).output;
    expect(out).toContain('"@/*": ["./src/*"]');
    expect(out).toContain('"baseUrl": "."');
    expect(tsconfigGenerator("", { pathAlias: "~" }).output).toContain('"~/*"');
  });

  it("explains options with comments and can omit them", () => {
    expect(tsconfigGenerator("", { comments: true }).output).toContain("// Enables the whole strict family of checks");
    expect(tsconfigGenerator("", { comments: false }).output).not.toContain("//");
  });

  it("noEmit presets drop output-only options", () => {
    const out = tsconfigGenerator("", { preset: "react-vite", sourceMap: true, declaration: true }).output;
    expect(out).toContain('"noEmit": true');
    expect(out).not.toMatch(/outDir|"declaration"|"sourceMap"/);
  });

  it("Next.js preset adds the plugin and includes", () => {
    const out = tsconfigGenerator("", { preset: "nextjs" }).output;
    expect(out).toContain('"plugins": [{"name":"next"}]');
    expect(out).toContain('"next-env.d.ts"');
  });

  it("include and exclude accept comma lists", () => {
    const out = tsconfigGenerator("", { include: "src, scripts/**/*.ts", exclude: "dist" }).output;
    expect(out).toContain('"include": ["src","scripts/**/*.ts"]');
    expect(out).toContain('"exclude": ["dist"]');
  });
});
