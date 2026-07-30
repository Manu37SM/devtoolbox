import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemePreference = "light" | "dark" | "system";

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

// Persisted to localStorage (standard zustand-persist JSON envelope) under
// this key. The blocking inline script in app/layout.tsx (themeInitScript)
// reads the SAME key/format before first paint to avoid a
// flash-of-unstyled-theme — if this key ever changes, update that script
// too.
export const THEME_STORAGE_KEY = "devtoolbox-theme";

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => {
        set({ theme });
        applyThemeClass(theme);
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme);
      },
    },
  ),
);

export function applyThemeClass(theme: ThemePreference): void {
  if (typeof document === "undefined") return;
  const resolved = theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}
