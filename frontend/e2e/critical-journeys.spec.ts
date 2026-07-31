import { test, expect } from "@playwright/test";

// Critical user journeys per DEVELOPMENT_GUIDE.md §6's E2E row. Only the
// journeys that exist in the shipped Phase 1 surface are covered here
// (pipelines and auth/share-link journeys are Phase 2/3 — not built yet,
// see AUDIT_REPORT.md §5).

test("use a tool: JSON Formatter formats input end-to-end", async ({ page }) => {
  await page.goto("/tools/json-formatter");

  const input = page.getByLabel("JSON input");
  await input.click();
  await input.fill('{"b":1,"a":2}');

  // CodeMirror mirrors its content into a live region; give the debounced
  // transform a moment to run rather than asserting immediately.
  await expect(page.getByText(/"a": 2/)).toBeVisible();
  await expect(page.getByText(/"b": 1/)).toBeVisible();
});

test("command palette: search + smart-paste detection", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("ControlOrMeta+k");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const search = page.getByPlaceholder(/search tools/i);
  await search.fill("json");
  await expect(page.getByRole("option").first()).toBeVisible();

  // Smart-paste: pasting a JWT-shaped string should surface the "open
  // JWT Decoder?" suggestion (lib/smart-detect.ts).
  await search.fill(
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
  );
  await expect(page.getByText(/open/i)).toBeVisible();
});

test("home page shows the tool catalog grouped by module", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "JSON Formatter" })).toBeVisible();
});
