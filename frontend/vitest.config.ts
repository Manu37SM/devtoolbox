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
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "e2e/**", ".storybook/**"],
  },
});
