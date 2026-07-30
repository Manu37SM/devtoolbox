"use client";

import { useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useShortcutsOverlayStore } from "@/store/shortcuts-overlay-store";

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "⌘/Ctrl + K", description: "Open the command palette" },
  { keys: "↑ / ↓", description: "Navigate command palette results" },
  { keys: "Enter", description: "Open the selected tool" },
  { keys: "Esc", description: "Close any open dialog" },
  { keys: "?", description: "Show this shortcuts overlay" },
];

/** Keyboard shortcuts overlay — P0 cross-cutting feature per FEATURE.md.
 * Opens on "?" (ignored while focus is in a text input/textarea so it
 * doesn't fire while typing a literal "?" into a tool). */
export function KeyboardShortcutsOverlay() {
  const { isOpen, open, close } = useShortcutsOverlayStore();

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      if (e.key === "?" && !isTyping) {
        e.preventDefault();
        open();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [open]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border-default bg-bg-overlay p-4 shadow-lg">
          <Dialog.Title className="mb-3 text-sm font-semibold text-text-primary">
            Keyboard shortcuts
          </Dialog.Title>
          <ul className="flex flex-col gap-2">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{s.description}</span>
                <kbd className="rounded-sm border border-border-subtle bg-bg-raised px-1.5 py-0.5 font-mono text-xs">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
