import { z } from "zod";

export const tsconfigGeneratorOptionsSchema = z.object({
  preset: z.enum(["node-app", "node-library", "library-esm", "browser", "react-vite", "nextjs", "angular-like", "bun-deno-style"]).default("node-app"),
  strictness: z.enum(["loose", "strict", "strictest"]).default("strict"),
  target: z.enum(["auto", "ES2017", "ES2019", "ES2020", "ES2021", "ES2022", "ES2023", "ESNext"]).default("auto"),
  module: z.enum(["auto", "ESNext", "NodeNext", "CommonJS", "Preserve"]).default("auto"),
  outDir: z.string().max(100).default("dist"),
  rootDir: z.string().max(100).default("src"),
  /** e.g. "@/*" maps to "./src/*" ("" disables) */
  pathAlias: z.string().max(60).default(""),
  include: z.string().max(300).default("src"),
  exclude: z.string().max(300).default("node_modules, dist"),
  sourceMap: z.boolean().default(true),
  declaration: z.boolean().default(false),
  skipLibCheck: z.boolean().default(true),
  esModuleInterop: z.boolean().default(true),
  resolveJsonModule: z.boolean().default(false),
  allowJs: z.boolean().default(false),
  incremental: z.boolean().default(false),
  isolatedModules: z.boolean().default(false),
  /** Add a // comment above each option explaining it */
  comments: z.boolean().default(true),
});
export type TsconfigGeneratorOptions = z.infer<typeof tsconfigGeneratorOptionsSchema>;
