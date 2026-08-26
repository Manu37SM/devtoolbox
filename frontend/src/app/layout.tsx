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

  manifest: "/manifest.json",
};

const themeColor = "#4f46e5";

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
