import { test, expect, type Page } from "@playwright/test";

// Shared input/output toolbars (ToolInput, OutputPane, ResultActions) and page shortcuts.

test.beforeEach(async ({ context, browserName }) => {
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
});

/** Hydration attaches handlers after first paint; wait for the toolbar to be interactive. */
async function openTool(page: Page, slug: string) {
  await page.goto(`/tools/${slug}`);
  await expect(page.getByRole("toolbar", { name: "Input actions" }).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
}

test("swap converts back: JSON -> YAML output becomes the input of YAML -> JSON", async ({ page }) => {
  await openTool(page, "json-yaml");
  await page.getByRole("textbox", { name: "Input" }).click();
  await page.keyboard.insertText('{"service":"orders","replicas":2}');
  const output = page.locator("textarea[readonly]");
  await expect(output).toHaveValue(/service: orders/);
  await expect(page.getByText(/33 chars · 1 line/)).toBeVisible();

  await page.getByRole("button", { name: "Swap: use output as input and reverse direction" }).click();
  await expect(page.getByRole("button", { name: "YAML → JSON" })).toHaveClass(/bg-accent/);
  await expect(output).toHaveValue(/"service": "orders"/);
});

test("clear is undoable and download uses the tool's file name", async ({ page }) => {
  await openTool(page, "json-yaml");
  await page.getByRole("textbox", { name: "Input" }).click();
  await page.keyboard.insertText('{"a":1}');
  await expect(page.locator("textarea[readonly]")).toHaveValue("a: 1\n");

  await page.getByRole("button", { name: "Clear input" }).click();
  await expect(page.getByRole("textbox", { name: "Input" })).toHaveText("");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("textbox", { name: "Input" })).toHaveText('{"a":1}');

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download as json-yaml.yaml" }).click();
  expect((await download).suggestedFilename()).toBe("json-yaml.yaml");

  const viaShortcut = page.waitForEvent("download");
  await page.keyboard.press("ControlOrMeta+s");
  expect((await viaShortcut).suggestedFilename()).toBe("json-yaml.yaml");
});

test("opening a binary file into a hex tool loads it as hex", async ({ page }) => {
  await openTool(page, "asn1-der-decoder");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "int.der",
    mimeType: "application/octet-stream",
    buffer: Buffer.from([0x30, 0x03, 0x02, 0x01, 0x00]),
  });
  await expect(page.getByRole("textbox", { name: "PEM, base64 or hex" })).toHaveValue("30 03 02 01 00");
  await expect(page.getByText("Loaded int.der (5 B) as hex")).toBeVisible();
  await expect(page.locator("textarea[readonly]")).toHaveValue(/SEQUENCE/);
});

test("text tools refuse binary files with a clear message", async ({ page }) => {
  await openTool(page, "case-converter");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]),
  });
  await expect(page.getByText("photo.png looks like a binary file; this tool expects text.")).toBeVisible();
});

test("structured results: per-value copy and copy-all", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "reads the clipboard back");
  await page.goto("/tools/cidr-subnet-calculator");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Copy Broadcast Address" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("192.168.1.255");
  await page.getByRole("button", { name: "Copy result as text" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Usable Hosts: 254");
});

test("overflow menu is keyboard operable", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "reads the clipboard back");
  await openTool(page, "base64");
  await page.getByRole("textbox", { name: "Base64 input" }).fill("hello");
  await expect(page.locator("textarea[readonly]")).toHaveValue("aGVsbG8=");
  const more = page.getByRole("button", { name: "More output actions" });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^"/);
  await expect(page.getByRole("menu")).toBeHidden();
  await expect(more).toBeFocused();
});
