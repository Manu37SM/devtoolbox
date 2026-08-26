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

  ".cm-cursor, .cm-dropCursor": {
    borderLeft: "2px solid var(--color-accent) !important",
  },
});

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

  }, []);

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
