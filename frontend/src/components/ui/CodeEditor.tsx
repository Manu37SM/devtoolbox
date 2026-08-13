"use client";

import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment, type Extension } from "@codemirror/state";
import { keymap, placeholder as placeholderExtension } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { markdown } from "@codemirror/lang-markdown";

export type CodeEditorLanguage =
  | "json"
  | "javascript"
  | "typescript"
  | "css"
  | "html"
  | "xml"
  | "yaml"
  | "markdown"
  | "plain";

export interface CodeEditorProps {
  value: string;
  /** Mirrors Textarea's onChange contract (DOM ChangeEvent with
   * `target.value`) so ToolView code can swap `<Textarea>` for
   * `<CodeEditor>` without changing its onChange handler — see
   * DEVELOPMENT_GUIDE.md's note that a CodeMirror wrapper should be a
   * drop-in replacement. The event is synthesized since CodeMirror
   * doesn't dispatch real textarea DOM events. */
  onChange: (e: { target: { value: string } }) => void;
  language?: CodeEditorLanguage;
  "aria-label"?: string;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

function languageExtension(language: CodeEditorLanguage | undefined): Extension[] {
  switch (language) {
    case "json":
      return [json()];
    case "javascript":
      return [javascript({ jsx: true })];
    case "typescript":
      return [javascript({ jsx: true, typescript: true })];
    case "css":
      return [css()];
    case "html":
      return [html()];
    case "xml":
      return [xml()];
    case "yaml":
      return [yaml()];
    case "markdown":
      return [markdown()];
    default:
      return [];
  }
}

// One shared theme extension reading the app's CSS custom properties
// (tailwind.config.ts §"colors") directly, so light/dark switches for
// free via the existing `.dark` class toggle on <html> — no JS theme
// sync needed between ThemeToggle and the editor.
const appTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "14px",
    backgroundColor: "var(--color-bg-raised)",
    color: "var(--color-text-primary)",
    border: "1px solid var(--color-border-default)",
    borderRadius: "8px",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--color-accent)",
  },
  ".cm-content": {
    fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
    lineHeight: "1.6",
    caretColor: "var(--color-text-primary)",
    padding: "12px 0",
  },
  ".cm-scroller": {
    overflow: "auto",
    borderRadius: "8px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--color-bg-raised)",
    color: "var(--color-text-muted)",
    border: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "var(--color-bg-overlay)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--color-bg-overlay)",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--color-accent) !important",
    opacity: "0.25",
  },
  // The blinking caret CodeMirror actually renders isn't the native text
  // caret — CM6's `drawSelection` (part of `basicSetup`) draws its own
  // `.cm-cursor` overlay and hides the real one, so setting `caretColor`
  // above (on `.cm-content`) has no visible effect on it. `drawSelection`
  // ships its own baseTheme rule — `.cm-cursor, .cm-dropCursor { borderLeft:
  // "1.2px solid black" }` (checked directly in
  // node_modules/@codemirror/view) — as a single `border-left` shorthand.
  // It also has a `"&dark .cm-cursor"` variant, but that only applies when
  // the editor is constructed with `EditorView.theme(styles, {dark: true})`,
  // which this app doesn't do (colors switch via the `.dark` class on
  // <html> + CSS custom properties instead, not CodeMirror's own dark
  // flag) — so that variant never engages and the plain black default wins
  // regardless of the app's theme. A previous fix here only set
  // `borderLeftColor`, which lost to the base theme's `border-left`
  // shorthand once actually loaded in the browser (its longhand write can
  // still land after ours depending on StyleModule insertion order) —
  // still invisible against the dark editor background (reported again:
  // "the blinking cursor is not visible"). Setting the full `borderLeft`
  // shorthand here, `!important`, removes any ordering ambiguity.
  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "2px solid var(--color-accent) !important",
  },
});

/** CodeMirror 6 wrapper — the real `CodeEditor` referenced by
 * UI_GUIDELINES.md §4 / DEVELOPMENT_GUIDE.md §5, replacing the plain
 * `<textarea>` stand-in (`Textarea`) for tools whose content benefits
 * from syntax highlighting, line numbers, and bracket matching (JSON,
 * JS/TS, CSS, HTML, XML, YAML, Markdown). Tools without a natural
 * "code" shape (plain text, case conversion, counters, etc.) should
 * keep using `Textarea` — this isn't a universal replacement, it's an
 * option for the tools that benefit from it. */
export function CodeEditor({
  value,
  onChange,
  language = "plain",
  "aria-label": ariaLabel,
  placeholder,
  readOnly = false,
  className,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        keymap.of([indentWithTab]),
        languageCompartment.current.of(languageExtension(language)),
        appTheme,
        EditorView.editable.of(!readOnly),
        EditorView.contentAttributes.of(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(placeholder ? [placeholderExtension(placeholder)] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current({ target: { value: update.state.doc.toString() } });
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally re-creating the editor only when the container mounts;
    // `value`/`language`/`readOnly` changes are handled by the effects
    // below via dispatch rather than a full remount, which would blow
    // away undo history and cursor position on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external `value` changes (e.g. loading a sample, clearing input)
  // without clobbering the cursor when the change originated from typing
  // in the editor itself (in which case `value` already matches doc).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: languageCompartment.current.reconfigure(languageExtension(language)) });
  }, [language]);

  return <div ref={containerRef} className={className ?? "h-full min-h-0 overflow-hidden"} />;
}
