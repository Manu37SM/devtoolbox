"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, ArrowLeftToLine, Check, Code2, Copy, Download, Maximize2, Minimize2, Quote, WrapText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToolIo } from "@/components/tools/ToolIoProvider";
import { PaneMenu, paneIconButtonClass } from "@/components/tools/PaneMenu";
import { downloadText, fullscreenPaneClass, useFullscreen, useStatus, useStoredFlag, writeClipboard } from "@/components/tools/pane-utils";
import { downloadFileName, fenceLanguage, formatStats, textStats, toMarkdownCodeBlock } from "@/lib/tool-io";
import { cn } from "@/lib/utils";

interface OutputPaneProps {
  label?: string;
  value: string;
  error?: string | null;
  placeholder?: string;
  /** Overrides the download file name chosen from the tool's settings and the content. */
  fileName?: string;
  /**
   * For two-way tools: reverses the tool's direction. When set, "Use as input"
   * becomes "Swap": the output moves to the input and the direction flips, so
   * JSON -> YAML becomes YAML -> JSON on the converted text.
   */
  onSwap?: () => void;
}

/**
 * Read-only tool output with copy, download, "use as input", copy as Markdown
 * or JSON string, word wrap, full screen and live counts. Inside a tool page it
 * also answers the page shortcuts (Ctrl+S, Alt+Shift+C/U).
 */
export function OutputPane({ label = "Output", value, error, placeholder, fileName, onSwap }: OutputPaneProps) {
  const outputId = useId();
  const io = useToolIo();
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useStoredFlag("dtb:wrap:output", true);
  const [full, setFull] = useFullscreen();
  const [status, setStatus] = useStatus();
  const hasValue = !error && value.length > 0;
  const stats = useMemo(() => (hasValue ? textStats(value) : null), [hasValue, value]);
  const name = fileName ?? downloadFileName(io?.slug, value, io?.config);
  const canChain = (!!onSwap || !!io?.config.chain) && (io?.inputCount ?? 0) > 0;
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const copyText = useCallback(
    async (text: string, message: string) => {
      if (!text) return;
      if (!(await writeClipboard(text))) {
        setStatus("Couldn't access the clipboard.");
        return;
      }
      setCopied(true);
      setStatus(message);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    },
    [setStatus],
  );

  const actions = {
    copy: () => void copyText(value, "Output copied"),
    download: () => {
      downloadText(value, name);
      setStatus(`Downloaded ${name}`);
    },
    useAsInput: () => {
      if (!canChain) return;
      io?.primaryInput()?.setValue(value);
      onSwap?.();
    },
  };
  const actionsRef = useRef(actions);
  const hasValueRef = useRef(hasValue);
  useLayoutEffect(() => {
    actionsRef.current = actions;
    hasValueRef.current = hasValue;
  });

  const register = io?.registerOutput;
  useEffect(() => {
    if (!register) return;
    return register({
      hasValue: () => hasValueRef.current,
      copy: () => actionsRef.current.copy(),
      download: () => actionsRef.current.download(),
      useAsInput: () => actionsRef.current.useAsInput(),
    });
  }, [register]);

  return (
    <div className={cn("flex h-full flex-col gap-1", full && fullscreenPaneClass)}>
      <label htmlFor={outputId} className="mb-1 text-sm font-medium text-text-secondary">
        {label}
      </label>
      <div className="min-h-0 flex-1" aria-live="polite">
        {error ? (
          <div
            role="alert"
            className="h-full overflow-auto rounded-md border border-danger/40 bg-danger/5 p-3 font-mono text-sm text-danger"
          >
            {error}
          </div>
        ) : (
          <Textarea
            id={outputId}
            value={value}
            readOnly
            placeholder={placeholder}
            wrap={wrap ? "soft" : "off"}
            className={cn(!wrap && "overflow-auto whitespace-pre")}
          />
        )}
      </div>
      <div className="flex min-h-8 items-center justify-between gap-2">
        <p role="status" className="min-w-0 truncate text-xs text-text-muted">
          {status ?? (stats ? formatStats(stats) : "")}
        </p>
        <div role="toolbar" aria-label="Output actions" className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="sm" onClick={actions.copy} disabled={!hasValue} aria-label="Copy output to clipboard">
            {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <button type="button" className={paneIconButtonClass} onClick={actions.download} disabled={!hasValue} aria-label={`Download as ${name}`} title={`Download as ${name} (Ctrl+S)`}>
            <Download className="h-4 w-4" aria-hidden="true" />
          </button>
          {canChain && (
            <button
              type="button"
              className={paneIconButtonClass}
              onClick={actions.useAsInput}
              disabled={!hasValue}
              aria-label={onSwap ? "Swap: use output as input and reverse direction" : "Use output as input"}
              title={onSwap ? "Swap: use output as input and reverse direction (Alt+Shift+U)" : "Use output as input (Alt+Shift+U)"}
            >
              {onSwap ? <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> : <ArrowLeftToLine className="h-4 w-4" aria-hidden="true" />}
            </button>
          )}
          {full && (
            <button type="button" className={paneIconButtonClass} aria-label="Exit full screen" title="Exit full screen (Esc)" onClick={() => setFull(false)}>
              <Minimize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <PaneMenu
            label="More output actions"
            items={[
              {
                label: "Copy as Markdown code block",
                icon: <Code2 className="h-3.5 w-3.5" />,
                disabled: !hasValue,
                onSelect: () => void copyText(toMarkdownCodeBlock(value, fenceLanguage(name)), "Copied as a Markdown code block"),
              },
              {
                label: "Copy as JSON string",
                icon: <Quote className="h-3.5 w-3.5" />,
                disabled: !hasValue,
                onSelect: () => void copyText(JSON.stringify(value), "Copied as a JSON string literal"),
              },
              { label: "Wrap long lines", icon: <WrapText className="h-3.5 w-3.5" />, checked: wrap, onSelect: () => setWrap(!wrap) },
              { label: full ? "Exit full screen" : "Full screen", icon: full ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />, onSelect: () => setFull(!full) },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
