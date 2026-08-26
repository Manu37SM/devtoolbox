import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NavState {

  collapsed: boolean;
  toggleCollapsed: () => void;

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

      partialize: (state) => ({ collapsed: state.collapsed }),
    },
  ),
);
