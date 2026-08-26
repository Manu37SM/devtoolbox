"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, ArrowRight } from "lucide-react";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { toolRegistry } from "@/lib/registry";
import { searchTools } from "@/lib/fuzzy-search";
import { detectToolForContent } from "@/lib/smart-detect";
import { getToolBySlug } from "@/lib/registry";

export function CommandPalette() {
  const { isOpen, open, close, toggle } = useCommandPaletteStore();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [toggle]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [isOpen]);

  const results = useMemo(() => searchTools(toolRegistry, query), [query]);
  const smartDetection = useMemo(() => detectToolForContent(query), [query]);
  const detectedTool = smartDetection ? getToolBySlug(smartDetection.toolSlug) : null;

  function navigateToTool(slug: string) {
    router.push(`/tools/${slug}`);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const target = results[activeIndex];
      if (target) navigateToTool(target.slug);
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(next) => (next ? open() : close())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-24 z-50 w-full max-w-lg -translate-x-1/2 rounded-lg border border-border-default bg-bg-overlay shadow-lg"
          onKeyDown={handleKeyDown}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">Search for a tool by name</Dialog.Description>
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
            <Search className="h-4 w-4 text-text-muted" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              placeholder="Search tools… (paste content to auto-detect)"
              className="flex-1 bg-transparent py-2 text-sm text-text-primary outline-none"
              aria-label="Search tools"
            />
            <kbd className="rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs text-text-muted">esc</kbd>
          </div>

          {detectedTool && (
            <button
              onClick={() => navigateToTool(detectedTool.slug)}
              className="flex w-full items-center justify-between gap-2 border-b border-border-subtle bg-accent/10 px-3 py-2 text-left text-sm"
            >
              <span>
                {smartDetection!.reason} — open <strong>{detectedTool.name}</strong>?
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <ul role="listbox" className="max-h-80 overflow-auto py-1">
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-text-muted">No tools found.</li>
            )}
            {results.map((tool, i) => (
              <li key={tool.slug}>
                <button
                  role="option"
                  aria-selected={i === activeIndex}
                  onClick={() => navigateToTool(tool.slug)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                    i === activeIndex ? "bg-accent text-accent-foreground" : "text-text-primary"
                  }`}
                >
                  <span>{tool.name}</span>
                  <span className={i === activeIndex ? "text-accent-foreground/70" : "text-text-muted"}>
                    {tool.module}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
