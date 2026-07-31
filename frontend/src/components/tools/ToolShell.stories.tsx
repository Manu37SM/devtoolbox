import type { Meta, StoryObj } from "@storybook/react";
import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { ToolShell } from "./ToolShell";

const sampleTool: ToolRegistryEntry = {
  slug: "json-formatter",
  name: "JSON Formatter",
  module: "data-format",
  description: "Format, validate, and minify JSON with syntax error highlighting and line numbers.",
  aliases: ["json beautifier", "json validator"],
  icon: "Braces",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["json formatter"] },
};

const meta = {
  title: "Tools/ToolShell",
  component: ToolShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ToolShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// ToolShell owns the page-level title/description chrome every tool page
// shares (UI_GUIDELINES.md §4) plus the history-recording/favorite-toggle
// effects (ToolPageEffects) — this story exercises the real component
// tree, not a mock, including its IndexedDB-backed favorite button (works
// here because Storybook renders in a real browser with real IndexedDB,
// unlike a jsdom-based unit test).
export const Default: Story = {
  args: {
    tool: sampleTool,
    children: (
      <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border-default text-sm text-text-muted">
        Tool content goes here
      </div>
    ),
  },
};
