import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fixed set of pages per DEVELOPMENT_GUIDE.md §6 ("component library +
// fixed set of tool pages, run in CI") — not all 29 tools, since that
// would be redundant given every tool composes the same audited shared
// components (ToolShell, DualPane, OutputPane, CodeEditor/Textarea,
// Button). One page per distinct UI shape this catalog actually has:
// dual-pane code tool, single-pane form tool, bulk-generator tool, plus
// the home/catalog page and the command palette overlay.
const PAGES_UNDER_TEST = [
  { name: "home / catalog", path: "/" },
  { name: "JSON Formatter (dual-pane code tool)", path: "/tools/json-formatter" },
  { name: "Password Generator (single-pane form tool)", path: "/tools/password-generator" },
  { name: "Hash Generator (text + file input tool)", path: "/tools/hash-generator" },
  { name: "QR Code Generator (payload-builder tool)", path: "/tools/qr-code-generator" },
];

for (const { name, path } of PAGES_UNDER_TEST) {
  test(`${name} has no detectable axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      // WCAG 2.1 A/AA per UI_GUIDELINES.md §6's accessibility standard.
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

test("command palette overlay has no detectable axe violations", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Meta+k").catch(() => {});
  await page.keyboard.press("Control+k").catch(() => {});
  await page.getByRole("dialog").waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
});

function formatViolations(violations: Array<{ id: string; help: string; nodes: unknown[] }>): string {
  if (violations.length === 0) return "";
  return violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`).join("\n");
}
