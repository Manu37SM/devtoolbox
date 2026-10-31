import type { TransformResult } from "@/lib/tool-transform";
import type { TsconfigGeneratorOptions } from "./schema";

type Compiler = Record<string, unknown>;

const EXPLAIN: Record<string, string> = {
  target: "JavaScript language level of the emitted code",
  module: "Module system of the emitted code",
  moduleResolution: "How import paths are resolved",
  lib: "Type definitions for built-in APIs",
  jsx: "How JSX is compiled",
  strict: "Enables the whole strict family of checks",
  noUncheckedIndexedAccess: "array[i] and obj[key] may be undefined",
  exactOptionalPropertyTypes: "Distinguish a missing property from one set to undefined",
  noImplicitOverride: "Require the override keyword when overriding",
  noImplicitReturns: "Every code path must return a value",
  noFallthroughCasesInSwitch: "Report fallthrough in switch statements",
  noUnusedLocals: "Error on unused local variables",
  noUnusedParameters: "Error on unused function parameters",
  noPropertyAccessFromIndexSignature: "Force obj['key'] for index-signature properties",
  forceConsistentCasingInFileNames: "Reject imports that differ only by case",
  outDir: "Where compiled files are written",
  rootDir: "Root of the input files; keeps the output folder structure",
  baseUrl: "Base for non-relative imports",
  paths: "Import aliases",
  sourceMap: "Emit .map files so debuggers show the TypeScript",
  declaration: "Emit .d.ts type declarations",
  declarationMap: "Emit maps from .d.ts back to the source",
  skipLibCheck: "Skip type checking of .d.ts files (faster, hides third-party errors)",
  esModuleInterop: "Allow default imports from CommonJS modules",
  resolveJsonModule: "Allow importing .json files",
  allowJs: "Allow .js files in the project",
  incremental: "Cache build information for faster rebuilds",
  tsBuildInfoFile: "Location of the incremental cache",
  isolatedModules: "Every file must be safe to transpile on its own (needed by esbuild, SWC, Babel)",
  verbatimModuleSyntax: "Keep import/export exactly as written; use 'import type' for types",
  noEmit: "Type-check only; another tool produces the JavaScript",
  allowImportingTsExtensions: "Allow imports ending in .ts (needs noEmit)",
  useDefineForClassFields: "Use standard class field semantics",
  types: "Only include these @types packages",
  plugins: "Editor language-service plugins",
  moduleDetection: "Treat every file as a module",
  composite: "Required for project references",
};

interface Base { compiler: Compiler; include?: string[]; }

function base(o: TsconfigGeneratorOptions): Base {
  const c: Compiler = {};
  switch (o.preset) {
    case "node-app":
      Object.assign(c, { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", lib: ["ES2023"], types: ["node"], outDir: o.outDir, rootDir: o.rootDir });
      break;
    case "node-library":
      Object.assign(c, { target: "ES2020", module: "CommonJS", moduleResolution: "Node10", lib: ["ES2020"], declaration: true, outDir: o.outDir, rootDir: o.rootDir });
      break;
    case "library-esm":
      Object.assign(c, { target: "ES2022", module: "NodeNext", moduleResolution: "NodeNext", lib: ["ES2022"], declaration: true, declarationMap: true, outDir: o.outDir, rootDir: o.rootDir });
      break;
    case "browser":
      Object.assign(c, { target: "ES2020", module: "ESNext", moduleResolution: "Bundler", lib: ["ES2020", "DOM", "DOM.Iterable"], noEmit: true });
      break;
    case "react-vite":
      Object.assign(c, { target: "ES2020", useDefineForClassFields: true, module: "ESNext", moduleResolution: "Bundler", lib: ["ES2020", "DOM", "DOM.Iterable"], jsx: "react-jsx", allowImportingTsExtensions: true, noEmit: true, isolatedModules: true, moduleDetection: "force" });
      break;
    case "nextjs":
      Object.assign(c, { target: "ES2017", lib: ["DOM", "DOM.Iterable", "ESNext"], module: "ESNext", moduleResolution: "Bundler", jsx: "preserve", noEmit: true, incremental: true, isolatedModules: true, allowJs: true });
      break;
    case "angular-like":
      Object.assign(c, { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", lib: ["ES2022", "DOM"], outDir: o.outDir, sourceMap: true, declaration: false, experimentalDecorators: true, useDefineForClassFields: false, importHelpers: true });
      break;
    case "bun-deno-style":
      Object.assign(c, { target: "ESNext", module: "Preserve", moduleResolution: "Bundler", lib: ["ESNext"], allowImportingTsExtensions: true, verbatimModuleSyntax: true, noEmit: true, moduleDetection: "force" });
      break;
  }
  return { compiler: c };
}

export function buildTsconfig(o: TsconfigGeneratorOptions): { compiler: Compiler; include: string[]; exclude: string[] } {
  const { compiler: c } = base(o);
  if (o.target !== "auto") c.target = o.target;
  if (o.module !== "auto") {
    c.module = o.module;
    if (o.module === "NodeNext") c.moduleResolution = "NodeNext";
    else if (o.module === "CommonJS") c.moduleResolution = c.moduleResolution === "NodeNext" || c.moduleResolution === "Bundler" ? "Node10" : c.moduleResolution;
    else c.moduleResolution = "Bundler"; // ESNext / Preserve
  }
  // "Preserve" and bundler resolution need a modern TypeScript but are valid together.
  if (o.strictness === "loose") c.strict = false;
  else {
    c.strict = true;
    c.forceConsistentCasingInFileNames = true;
    if (o.strictness === "strictest") {
      Object.assign(c, { noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, noImplicitOverride: true, noImplicitReturns: true, noFallthroughCasesInSwitch: true, noUnusedLocals: true, noUnusedParameters: true, noPropertyAccessFromIndexSignature: true });
    }
  }
  if (o.sourceMap && !c.noEmit) c.sourceMap = true;
  if (o.declaration && !c.noEmit) c.declaration = true;
  if (o.skipLibCheck) c.skipLibCheck = true;
  if (o.esModuleInterop && c.module !== "Preserve") c.esModuleInterop = true;
  if (o.resolveJsonModule) c.resolveJsonModule = true;
  if (o.allowJs) c.allowJs = true;
  if (o.incremental) {
    c.incremental = true;
    if (c.noEmit) c.tsBuildInfoFile = "./node_modules/.cache/tsbuildinfo.json";
  }
  if (o.isolatedModules) c.isolatedModules = true;
  if (o.preset === "nextjs") c.plugins = [{ name: "next" }];
  if (c.noEmit) { delete c.outDir; delete c.rootDir; delete c.declaration; delete c.declarationMap; delete c.sourceMap; }
  if (c.allowImportingTsExtensions && !c.noEmit) delete c.allowImportingTsExtensions;
  if (o.pathAlias.trim()) {
    const alias = o.pathAlias.trim().endsWith("*") ? o.pathAlias.trim() : `${o.pathAlias.trim().replace(/\/$/, "")}/*`;
    const root = (o.preset === "nextjs" ? "." : o.rootDir || "src").replace(/^\.\//, "").replace(/\/$/, "");
    c.baseUrl = ".";
    c.paths = { [alias]: [`./${root}/*`] };
  }
  const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  const include = list(o.include);
  if (o.preset === "nextjs") include.push("next-env.d.ts", ".next/types/**/*.ts");
  return { compiler: c, include: include.length ? include : ["src"], exclude: list(o.exclude) };
}

const ORDER = ["target", "module", "moduleResolution", "lib", "jsx", "types", "baseUrl", "paths", "outDir", "rootDir", "strict"];

function render(value: unknown, indent: string): string {
  if (Array.isArray(value)) return JSON.stringify(value);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, string[]>);
    return `{\n${entries.map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

export function tsconfigGenerator(_input: string, options: Partial<TsconfigGeneratorOptions>): TransformResult {
  const o: TsconfigGeneratorOptions = {
    preset: options.preset ?? "node-app", strictness: options.strictness ?? "strict", target: options.target ?? "auto", module: options.module ?? "auto",
    outDir: options.outDir ?? "dist", rootDir: options.rootDir ?? "src", pathAlias: options.pathAlias ?? "", include: options.include ?? "src",
    exclude: options.exclude ?? "node_modules, dist", sourceMap: options.sourceMap ?? true, declaration: options.declaration ?? false,
    skipLibCheck: options.skipLibCheck ?? true, esModuleInterop: options.esModuleInterop ?? true, resolveJsonModule: options.resolveJsonModule ?? false,
    allowJs: options.allowJs ?? false, incremental: options.incremental ?? false, isolatedModules: options.isolatedModules ?? false, comments: options.comments ?? true,
  };
  const { compiler, include, exclude } = buildTsconfig(o);
  const keys = [...ORDER.filter((k) => k in compiler), ...Object.keys(compiler).filter((k) => !ORDER.includes(k)).sort()];
  const lines: string[] = [];
  keys.forEach((k, i) => {
    if (o.comments && EXPLAIN[k]) lines.push(`    // ${EXPLAIN[k]}`);
    lines.push(`    ${JSON.stringify(k)}: ${render(compiler[k], "    ")}${i < keys.length - 1 ? "," : ""}`);
  });
  const out = ["{", '  "compilerOptions": {', ...lines, "  },", `  "include": ${JSON.stringify(include)},`, `  "exclude": ${JSON.stringify(exclude)}`, "}"].join("\n");
  return { output: out + "\n", error: null };
}
