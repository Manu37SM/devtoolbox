import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Explicit Vitest scoping: without this config, Vitest falls back to its
// default include glob (`**/*.{test,spec}.*`), which matches both our
// own unit tests (always named `*.test.ts`, per DEVELOPMENT_GUIDE.md §5's
// tool contract) AND the Playwright specs under e2e/ (named
// `*.spec.ts`), which use Playwright's own `test()` API and can't run
// under Vitest at all — see AUDIT_REPORT.md §7.10 for the failure this
// caused. Playwright specs run only via `npm run test:e2e`
// (playwright.config.ts), never via `vitest run`.
export default defineConfig({
  // Mirrors tsconfig.json's "@/*" -> "./src/*" path alias. Every existing
  // transform.ts avoided "@/..." imports specifically so tests didn't need
  // this, but pipeline-adapters.ts (Phase 2 Pipelines feature) legitimately
  // needs to import ~20 tools' transform.ts/schema.ts by their real
  // module-registry path, so we resolve the alias here instead of
  // rewriting every import to a long relative path.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**", ".storybook/**"],
  },
});
