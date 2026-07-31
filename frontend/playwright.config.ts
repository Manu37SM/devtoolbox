import { defineConfig, devices } from "@playwright/test";

// Per DEVELOPMENT_GUIDE.md §6/§7: Playwright drives both the E2E
// "critical user journeys" suite and the axe-core accessibility smoke
// suite (via @axe-core/playwright) against a running app build. CI runs
// this against a preview build; locally it expects `npm run dev` (or
// `npm run build && npm run start`) already running on PORT, matching
// the `webServer` block below so `npx playwright test` also works
// standalone without a separately-started server.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
