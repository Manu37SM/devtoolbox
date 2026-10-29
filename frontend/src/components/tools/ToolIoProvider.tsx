"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getToolIo, type ToolIoConfig } from "@/lib/tool-io";

/** What an input pane exposes to page-level actions (shortcuts, "Use as input"). */
export interface InputHandle {
  setValue: (value: string) => void;
  paste: () => void;
  clear: () => void;
  focus: () => void;
}

/** What an output pane exposes to page-level shortcuts. */
export interface OutputHandle {
  hasValue: () => boolean;
  copy: () => void;
  download: () => void;
  useAsInput: () => void;
}

interface ToolIoContextValue {
  slug: string;
  config: ToolIoConfig;
  /** Number of registered inputs; re-renders outputs so "Use as input" can appear. */
  inputCount: number;
  registerInput: (handle: InputHandle) => () => void;
  registerOutput: (handle: OutputHandle) => () => void;
  primaryInput: () => InputHandle | null;
}

const ToolIoContext = createContext<ToolIoContextValue | null>(null);

/** Null outside a tool page (e.g. Storybook, pipelines), where panes work standalone. */
export function useToolIo(): ToolIoContextValue | null {
  return useContext(ToolIoContext);
}

/**
 * Connects a tool page's input and output panes and owns the page-wide
 * shortcuts. The first input to mount is the "primary" one that paste, clear
 * and "Use as input" target; the first output is the one copy and download use.
 */
export function ToolIoProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const inputs = useRef<InputHandle[]>([]);
  const outputs = useRef<OutputHandle[]>([]);
  const [inputCount, setInputCount] = useState(0);

  const registerInput = useCallback((h: InputHandle) => {
    inputs.current.push(h);
    setInputCount(inputs.current.length);
    return () => {
      inputs.current = inputs.current.filter((x) => x !== h);
      setInputCount(inputs.current.length);
    };
  }, []);

  const registerOutput = useCallback((h: OutputHandle) => {
    outputs.current.push(h);
    return () => {
      outputs.current = outputs.current.filter((x) => x !== h);
    };
  }, []);

  const primaryInput = useCallback(() => inputs.current[0] ?? null, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.isComposing) return;
      const mod = e.ctrlKey || e.metaKey;
      const out = outputs.current[0];
      const inp = inputs.current[0];
      if (mod && !e.shiftKey && !e.altKey && e.code === "KeyS") {
        if (out?.hasValue()) {
          e.preventDefault();
          out.download();
        }
        return;
      }
      // Alt+Shift (Option+Shift on macOS) chords; matched on e.code so they work on any layout.
      if (!e.altKey || !e.shiftKey || mod) return;
      const actions: Record<string, (() => void) | undefined> = {
        KeyC: out?.hasValue() ? out.copy : undefined,
        KeyU: out?.hasValue() ? out.useAsInput : undefined,
        KeyV: inp?.paste,
        KeyX: inp?.clear,
        KeyE: inp?.focus,
      };
      const action = actions[e.code];
      if (action) {
        e.preventDefault();
        action();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo<ToolIoContextValue>(
    () => ({ slug, config: getToolIo(slug), inputCount, registerInput, registerOutput, primaryInput }),
    [slug, inputCount, registerInput, registerOutput, primaryInput],
  );

  return <ToolIoContext.Provider value={value}>{children}</ToolIoContext.Provider>;
}

/** Page shortcuts, listed in the "?" overlay. */
export const TOOL_SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "⌘/Ctrl + S", description: "Download the output" },
  { keys: "Alt + Shift + C", description: "Copy the output" },
  { keys: "Alt + Shift + U", description: "Use the output as input" },
  { keys: "Alt + Shift + V", description: "Replace the input with the clipboard" },
  { keys: "Alt + Shift + X", description: "Clear the input" },
  { keys: "Alt + Shift + E", description: "Focus the input" },
];
