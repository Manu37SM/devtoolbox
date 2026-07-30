import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DevToolbox — free developer tools",
    template: "%s · DevToolbox",
  },
  description:
    "60+ free, AI-augmented developer tools: JSON/YAML/XML converters, encoders, hashers, formatters, and more. Client-side, private, no signup required.",
};

// Blocking inline script reads the persisted theme preference before first
// paint so there's no flash-of-unstyled-theme (UI_GUIDELINES.md §3).
// Reads the same localStorage key + JSON envelope shape that
// `store/theme-store.ts`'s zustand-persist writes — keep these in sync.
const themeInitScript = `
(function () {
  try {
    var raw = localStorage.getItem("devtoolbox-theme");
    var theme = raw ? JSON.parse(raw).state.theme : "system";
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    if (resolved === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
