import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NavState {
  /** Desktop left nav: full (240px) vs. icon rail (64px) — UI_GUIDELINES.md §3. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile/below-`lg` drawer: hidden by default, opened via the top bar
   * hamburger button — UI_GUIDELINES.md §7. Not persisted; always starts
   * closed on a fresh page load. */
  isMobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

export const NAV_STORAGE_KEY = "devtoolbox-nav";

export const useNavStore = create<NavState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      isMobileOpen: false,
      openMobile: () => set({ isMobileOpen: true }),
      closeMobile: () => set({ isMobileOpen: false }),
    }),
    {
      name: NAV_STORAGE_KEY,
      // Only the desktop collapse preference is worth persisting — the
      // mobile drawer should always start closed, not resume whatever
      // state it was in on a different device/session.
      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
);
