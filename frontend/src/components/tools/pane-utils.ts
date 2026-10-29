"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { mimeForFileName } from "@/lib/tool-io";

/** Writes text to the clipboard, falling back to execCommand where the async API is blocked. */
export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

/** Reads clipboard text; null when the browser refuses (permissions, Firefox without user activation). */
export async function readClipboard(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) return null;
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export function downloadText(text: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeForFileName(fileName) }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** A boolean preference remembered in localStorage (per browser); falls back to the default. */
export function useStoredFlag(key: string, defaultValue: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(defaultValue);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount to keep SSR markup stable
      if (raw === "1" || raw === "0") setValue(raw === "1");
    } catch {
      /* storage unavailable */
    }
  }, [key]);
  const set = useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
    },
    [key],
  );
  return [value, set];
}

/** Full-screen state for a pane: Escape exits and page scrolling is locked while open. */
export function useFullscreen(): [boolean, (v: boolean) => void] {
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !e.defaultPrevented) setFull(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);
  return [full, setFull];
}

/** A transient status message for a pane's live region. */
export function useStatus(ms = 4000): [string | null, (msg: string | null) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback(
    (m: string | null) => {
      if (timer.current) clearTimeout(timer.current);
      setMsg(m);
      if (m) timer.current = setTimeout(() => setMsg(null), ms);
    },
    [ms],
  );
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [msg, show];
}

export const fullscreenPaneClass = "fixed inset-0 z-50 flex flex-col gap-2 bg-bg-base p-4 sm:p-6";
