import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { AuthHydrator } from "@/components/auth/AuthHydrator";

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
  // PWA/offline support (FEATURE.md's Cross-Cutting Platform Features, P1).
  // `manifest` is a first-class field on Next 15's `Metadata` type, so we
  // use that instead of a hand-written `<link rel="manifest">` — see
  // frontend/public/manifest.json for the actual manifest, and
  // frontend/public/sw.js for the service worker it pairs with.
  manifest: "/manifest.json",
};

// Matches manifest.json's theme_color, which in turn matches the light-mode
// --color-accent design token in globals.css.
const themeColor = "#4f46e5";

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
        <meta name="theme-color" content={themeColor} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistration />
        <AuthHydrator />
      </body>
    </html>
  );
}
