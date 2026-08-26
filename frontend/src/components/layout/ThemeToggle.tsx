"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeStore, applyThemeClass, type ThemePreference } from "@/store/theme-store";

const CYCLE: ThemePreference[] = ["light", "dark", "system"];
const ICONS: Record<ThemePreference, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    applyThemeClass(theme);
  }, [theme]);

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" disabled />;
  }

  const Icon = ICONS[theme];
  const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]!;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Click to switch to ${next}.`}
      onClick={() => setTheme(next)}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
