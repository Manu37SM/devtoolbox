"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaneMenuItem {
  label: string;
  onSelect: () => void;
  /** Renders as a checkable item (aria-checked) when defined. */
  checked?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
}

/** Small accessible overflow menu for pane toolbars (menu button pattern). */
export function PaneMenu({ label, items }: { label: string; items: PaneMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([aria-disabled="true"])')?.focus();
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function close(refocus = true) {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  }

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const i = nodes.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i + (e.key === "ArrowDown" ? 1 : -1) + nodes.length) % nodes.length;
      nodes[next]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      nodes[e.key === "Home" ? 0 : nodes.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={paneIconButtonClass}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute bottom-full right-0 z-40 mb-1 min-w-[15rem] rounded-md border border-border-default bg-bg-overlay py-1 shadow-lg"
        >
          {items.map((item) => (
            <div
              key={item.label}
              role={item.checked === undefined ? "menuitem" : "menuitemcheckbox"}
              aria-checked={item.checked === undefined ? undefined : item.checked}
              aria-disabled={item.disabled || undefined}
              tabIndex={-1}
              onClick={() => {
                if (item.disabled) return;
                close();
                item.onSelect();
              }}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !item.disabled) {
                  e.preventDefault();
                  close();
                  item.onSelect();
                }
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm text-text-primary outline-none hover:bg-bg-raised focus:bg-bg-raised",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex w-4 justify-center text-text-secondary" aria-hidden="true">
                {item.checked === undefined ? item.icon : item.checked ? "✓" : ""}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <kbd className="font-mono text-xs text-text-muted">{item.shortcut}</kbd>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const paneIconButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-bg-raised hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-bg-raised aria-pressed:text-accent";
