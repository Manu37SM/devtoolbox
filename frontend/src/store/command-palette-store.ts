import { create } from "zustand";

interface CommandPaletteState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// Cross-cutting UI state (not persisted — palette should always start
// closed on load) per ARCHITECTURE.md §8.2's "Zustand for cross-cutting
// app state (theme, command palette, active pipeline)".
export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
