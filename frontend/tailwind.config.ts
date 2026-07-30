import type { Config } from "tailwindcss";

// Design tokens per UI_GUIDELINES.md §2 — components reference these
// semantic names, never raw hex values, so themes/white-label can swap
// the CSS variables without touching component code.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "var(--color-bg-base)",
          raised: "var(--color-bg-raised)",
          overlay: "var(--color-bg-overlay)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        success: { DEFAULT: "var(--color-success)", foreground: "var(--color-success-foreground)" },
        warning: { DEFAULT: "var(--color-warning)", foreground: "var(--color-warning-foreground)" },
        danger: { DEFAULT: "var(--color-danger)", foreground: "var(--color-danger-foreground)" },
        info: { DEFAULT: "var(--color-info)", foreground: "var(--color-info-foreground)" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        xs: "12px",
        sm: "13px",
        base: "14px",
        md: "16px",
        lg: "18px",
        xl: "22px",
        "2xl": "28px",
        "3xl": "36px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
      },
      transitionDuration: {
        fast: "100ms",
        base: "150ms",
        slow: "250ms",
      },
    },
  },
  plugins: [],
};

export default config;
