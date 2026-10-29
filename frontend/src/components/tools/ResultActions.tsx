"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToolIo } from "@/components/tools/ToolIoProvider";
import { paneIconButtonClass } from "@/components/tools/PaneMenu";
import { downloadText, writeClipboard } from "@/components/tools/pane-utils";
import { cn } from "@/lib/utils";

function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [
    copied,
    () => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    },
  ];
}

/** Small icon button that copies one value (a field in a result list, a table cell, a key). */
export function CopyValue({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, markCopied] = useCopied();
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        if (await writeClipboard(value)) markCopied();
      }}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
      title={`Copy ${label}`}
      className={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-bg-overlay hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
    </button>
  );
}

/**
 * Toolbar for tools whose result is structured (field lists, tables, diffs)
 * rather than a single text output: copy everything as text, copy as JSON and
 * download. Also registers as the page output so Ctrl+S and Alt+Shift+C work.
 */
export function ResultActions({
  text,
  json,
  fileName,
  className,
}: {
  /** Plain-text rendering of the whole result. */
  text: string;
  /** Structured form for "Copy as JSON" and the .json download; omit when not meaningful. */
  json?: unknown;
  /** Download name; defaults to <slug>.json when json is given, else <slug>.txt. */
  fileName?: string;
  className?: string;
}) {
  const io = useToolIo();
  const [copied, markCopied] = useCopied();
  const [status, setStatus] = useState<string | null>(null);
  const jsonText = json === undefined ? null : JSON.stringify(json, null, 2);
  const name = fileName ?? `${io?.slug ?? "result"}.${jsonText !== null ? "json" : "txt"}`;
  const body = name.endsWith(".json") && jsonText !== null ? jsonText : text;
  const has = text.length > 0;

  const latest = useRef({ text, body, name });
  useEffect(() => {
    latest.current = { text, body, name };
  });
  const hasRef = useRef(has);
  useEffect(() => {
    hasRef.current = has;
  });
  const register = io?.registerOutput;
  useEffect(() => {
    if (!register) return;
    return register({
      hasValue: () => hasRef.current,
      copy: () => void writeClipboard(latest.current.text).then((ok) => ok && setStatus("Result copied")),
      download: () => {
        downloadText(latest.current.body, latest.current.name);
        setStatus(`Downloaded ${latest.current.name}`);
      },
      useAsInput: () => undefined,
    });
  }, [register]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <p role="status" className="min-w-0 truncate text-xs text-text-muted">
        {status ?? ""}
      </p>
      <div role="toolbar" aria-label="Result actions" className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          disabled={!has}
          onClick={async () => {
            if (await writeClipboard(text)) {
              markCopied();
              setStatus("Result copied");
            }
          }}
          aria-label="Copy result as text"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        {jsonText !== null && (
          <button
            type="button"
            className={paneIconButtonClass}
            disabled={!has}
            aria-label="Copy result as JSON"
            title="Copy result as JSON"
            onClick={async () => {
              if (await writeClipboard(jsonText)) setStatus("Copied as JSON");
            }}
          >
            <Braces className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={paneIconButtonClass}
          disabled={!has}
          aria-label={`Download as ${name}`}
          title={`Download as ${name} (Ctrl+S)`}
          onClick={() => {
            downloadText(body, name);
            setStatus(`Downloaded ${name}`);
          }}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Renders "label: value" lines for ResultActions' plain-text copy. */
export function toLines(rows: ReadonlyArray<ReadonlyArray<string | number | boolean | null | undefined>>): string {
  return rows
    .filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== "")
    .map((row) => `${row[0]}: ${row[1]}`)
    .join("\n");
}
