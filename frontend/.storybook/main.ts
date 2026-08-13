import type { StorybookConfig } from "@storybook/nextjs";

// Minimal Storybook config for the shared component library
// (DEVELOPMENT_GUIDE.md §6/§7: "Storybook story for any new shared
// component", "Storybook build + a11y check" in CI). Intentionally uses
// only @storybook/nextjs (already an approved devDependency) plus its
// bundled essential addons rather than pulling in extra addon packages —
// see AUDIT_REPORT.md §7.8 for the rationale and what's deliberately out
// of scope for this pass (Chromatic/Percy visual regression).
const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
