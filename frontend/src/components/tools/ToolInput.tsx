"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from "react";
import {
  ClipboardPaste,
  Copy,
  Eraser,
  FileUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scissors,
  TextSelect,
  Undo2,
  WrapText,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor, type CodeEditorLanguage } from "@/components/ui/CodeEditor";
import { useToolIo } from "@/components/tools/ToolIoProvider";
import { PaneMenu, paneIconButtonClass } from "@/components/tools/PaneMenu";
import { fullscreenPaneClass, readClipboard, useFullscreen, useStatus, useStoredFlag, writeClipboard } from "@/components/tools/pane-utils";
import { MAX_FILE_BYTES, decodeFileBytes, formatBytes, formatStats, textStats } from "@/lib/tool-io";
import { cn } from "@/lib/utils";

type ChangeHandler = (e: { target: { value: string } }) => void;

export interface ToolInputProps {
  value: string;
  onChange: ChangeHandler;
  /** "code" renders the CodeMirror editor; default is a plain textarea. */
  as?: "textarea" | "code";
  language?: CodeEditorLanguage;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  className?: string;
}

/** Above this size, replacing text goes through React state instead of execCommand (which is slow on huge strings). */
const NATIVE_EDIT_LIMIT = 1_000_000;

/** Height utilities that mean the tool sized this field deliberately (h-40, h-auto min-h-[120px] ...). */
const SIZED = /(^|\s)(h-(?!full\b)[\w[\].-]+|min-h-[\w[\].-]+)/;

/**
 * A tool input field with a toolbar: paste, open or drop a file, reset to the
 * example, clear (undoable), copy/cut, word wrap, full screen and live
 * character/line/byte counts. Drop-in replacement for Textarea/CodeEditor in
 * tool views; works without a ToolIoProvider too.
 */
export function ToolInput({ value, onChange, as = "textarea", language, placeholder, "aria-label": ariaLabel, id, className }: ToolInputProps) {
  const io = useToolIo();
  const config = io?.config ?? {};
  const isCode = as === "code";
  const [initial] = useState(value);
  const [wrap, setWrap] = useStoredFlag(isCode ? "dtb:wrap:code-input" : "dtb:wrap:input", true);
  const [full, setFull] = useFullscreen();
  const [status, setStatus] = useStatus();
  const [undoValue, setUndoValue] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [dragging, setDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });
  /** Value most recently set by a toolbar action; any other edit invalidates "Undo". */
  const expectedRef = useRef<string | null>(null);
  const handleChange: ChangeHandler = (e) => {
    if (e.target.value !== expectedRef.current) setUndoValue(null);
    onChange(e);
  };

  const stats = useMemo(() => textStats(value), [value]);

  /** Replaces the whole value, keeping the browser's own undo history where possible. */
  const replaceValue = useCallback(
    (next: string) => {
      expectedRef.current = next;
      const ta = textareaRef.current;
      if (!isCode && ta && next.length < NATIVE_EDIT_LIMIT && valueRef.current.length < NATIVE_EDIT_LIMIT) {
        ta.focus();
        ta.setSelectionRange(0, ta.value.length);
        let ok = false;
        try {
          ok = next ? document.execCommand("insertText", false, next) : document.execCommand("delete");
        } catch {
          ok = false;
        }
        if (ok && ta.value === next) return;
      }
      // CodeMirror records programmatic changes in its own history, so Ctrl+Z works there too.
      onChangeRef.current({ target: { value: next } });
    },
    [isCode],
  );

  const focus = useCallback(() => {
    if (isCode) rootRef.current?.querySelector<HTMLElement>(".cm-content")?.focus();
    else textareaRef.current?.focus();
  }, [isCode]);

  const clear = useCallback(() => {
    const prev = valueRef.current;
    if (!prev) return;
    replaceValue("");
    setUndoValue(prev);
    setStatus("Input cleared");
  }, [replaceValue, setStatus]);

  const paste = useCallback(async () => {
    const text = await readClipboard();
    if (text === null) {
      setStatus("Clipboard access was blocked. Click in the field and press Ctrl+V (⌘V) instead.");
      focus();
      return;
    }
    if (!text) {
      setStatus("The clipboard has no text.");
      return;
    }
    replaceValue(text);
    setUndoValue(null);
    setStatus(`Pasted ${formatBytes(new TextEncoder().encode(text).length)} from the clipboard`);
  }, [focus, replaceValue, setStatus]);

  const loadFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        setStatus(`${file.name} is ${formatBytes(file.size)}; files up to ${formatBytes(MAX_FILE_BYTES)} can be loaded.`);
        return;
      }
      const result = decodeFileBytes(file.name, new Uint8Array(await file.arrayBuffer()), config.fileRead);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      const prev = valueRef.current;
      replaceValue(result.text);
      setUndoValue(prev || null);
      setStatus(result.note);
    },
    [config.fileRead, replaceValue, setStatus],
  );

  // Register as a page-level input (shortcuts, "Use as input" from the output pane).
  const handleRef = useRef({ setValue: replaceValue, paste: () => void paste(), clear, focus });
  useLayoutEffect(() => {
    handleRef.current = { setValue: replaceValue, paste: () => void paste(), clear, focus };
  });
  const register = io?.registerInput;
  useEffect(() => {
    if (!register) return;
    return register({
      setValue: (v) => {
        const prev = valueRef.current;
        handleRef.current.setValue(v);
        setUndoValue(prev || null);
        setStatus("Output moved to input");
      },
      paste: () => handleRef.current.paste(),
      clear: () => handleRef.current.clear(),
      focus: () => handleRef.current.focus(),
    });
  }, [register, setStatus]);

  function undo() {
    if (undoValue === null) return;
    replaceValue(undoValue);
    setUndoValue(null);
    setStatus("Restored the previous input");
  }

  async function copy(cut: boolean) {
    if (!value) return;
    const ok = await writeClipboard(value);
    if (!ok) {
      setStatus("Couldn't access the clipboard.");
      return;
    }
    if (cut) {
      replaceValue("");
      setUndoValue(value);
      setStatus("Input cut to the clipboard");
    } else setStatus("Input copied");
  }

  function onDragOver(e: DragEvent) {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragging(true);
  }

  function onDrop(e: DragEvent) {
    const file = e.dataTransfer.files?.[0];
    setDragging(false);
    if (!file) return;
    e.preventDefault();
    void loadFile(file);
  }

  function onPaste(e: ClipboardEvent) {
    // A file copied in the OS file manager arrives as clipboardData.files with no text.
    const file = e.clipboardData.files?.[0];
    if (file && !e.clipboardData.getData("text/plain")) {
      e.preventDefault();
      void loadFile(file);
    }
  }

  const sized = !!className && SIZED.test(className);
  function applyExample() {
    if (initial) {
      setUndoValue(value || null);
      replaceValue(initial);
      setStatus("Example restored");
    } else if (config.sample) {
      replaceValue(config.sample);
      setStatus("Example loaded");
    }
  }
  const exampleLabel = initial && value !== initial ? "Reset to the example" : !initial && !value && config.sample ? "Load an example" : null;

  return (
    <div
      ref={rootRef}
      className={cn("relative flex flex-col gap-1", full ? fullscreenPaneClass : sized ? "" : "min-h-0 flex-1")}
      onDragOver={onDragOver}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
      }}
      onDrop={onDrop}
      onPaste={onPaste}
    >
      {full && ariaLabel && <p className="text-sm font-medium text-text-secondary">{ariaLabel}</p>}
      {isCode ? (
        <div className={cn("min-h-24 flex-1", full && "min-h-0", className)}>
          <CodeEditor value={value} onChange={handleChange} language={language} placeholder={placeholder} aria-label={ariaLabel} wrap={wrap} />
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          aria-label={ariaLabel}
          wrap={wrap ? "soft" : "off"}
          onSelect={(e) => setSelected(Math.abs(e.currentTarget.selectionEnd - e.currentTarget.selectionStart))}
          className={cn(full ? "min-h-0 flex-1" : sized ? "" : "min-h-24 flex-1", !wrap && "overflow-auto whitespace-pre", className, full && "h-auto")}
        />
      )}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-accent bg-bg-base/80 text-sm font-medium text-text-primary">
          Drop a file to load it
        </div>
      )}
      <div className="flex min-h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <p role="status" className="min-w-0 truncate text-xs text-text-muted">
            {status ?? (value ? formatStats(stats, selected) : "")}
          </p>
          {undoValue !== null && (
            <button type="button" onClick={undo} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline">
              <Undo2 className="h-3 w-3" aria-hidden="true" />
              Undo
            </button>
          )}
        </div>
        <div role="toolbar" aria-label="Input actions" className="flex shrink-0 items-center">
          <button type="button" className={paneIconButtonClass} aria-label="Paste from clipboard (replace input)" title="Paste from clipboard (replace input)" onClick={() => void paste()}>
            <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className={paneIconButtonClass} aria-label="Open a file" title="Open a file (or drop one here)" onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
          </button>
          {exampleLabel && (
            <button type="button" className={paneIconButtonClass} aria-label={exampleLabel} title={exampleLabel} onClick={applyExample}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" className={paneIconButtonClass} aria-label="Clear input" title="Clear input" disabled={!value} onClick={clear}>
            <Eraser className="h-4 w-4" aria-hidden="true" />
          </button>
          {full && (
            <button type="button" className={paneIconButtonClass} aria-label="Exit full screen" title="Exit full screen (Esc)" onClick={() => setFull(false)}>
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <PaneMenu
            label="More input actions"
            items={[
              { label: "Copy input", icon: <Copy className="h-3.5 w-3.5" />, disabled: !value, onSelect: () => void copy(false) },
              { label: "Cut input", icon: <Scissors className="h-3.5 w-3.5" />, disabled: !value, onSelect: () => void copy(true) },
              {
                label: "Select all",
                icon: <TextSelect className="h-3.5 w-3.5" />,
                disabled: !value,
                onSelect: () => {
                  if (isCode) {
                    focus();
                    document.execCommand("selectAll");
                  } else {
                    textareaRef.current?.focus();
                    textareaRef.current?.select();
                  }
                },
              },
              { label: "Wrap long lines", icon: <WrapText className="h-3.5 w-3.5" />, checked: wrap, onSelect: () => setWrap(!wrap) },
              { label: full ? "Exit full screen" : "Full screen", icon: full ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />, onSelect: () => setFull(!full) },
            ]}
          />
          <input
            ref={fileRef}
            type="file"
            accept={config.accept && config.accept !== "*" ? config.accept : undefined}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void loadFile(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}
