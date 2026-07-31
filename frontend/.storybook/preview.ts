import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

// Global decorators/parameters for every story. `@storybook/addon-a11y`
// (configured in main.ts) runs axe-core against every story automatically
// and surfaces violations in the Accessibility panel — this is the
// "component library" half of DEVELOPMENT_GUIDE.md §6's a11y row; the
// "fixed set of tool pages" half is covered by the Playwright + axe-core
// smoke suite in e2e/a11y.spec.ts instead, since full tool pages need
// real routing/data that Storybook isolation doesn't provide.
const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "var(--color-bg-base)" },
      ],
    },
  },
};

export default preview;
