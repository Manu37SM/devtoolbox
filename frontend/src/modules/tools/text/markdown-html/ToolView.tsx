"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { markdownToHtml } from "./transform";

export function MarkdownHtmlToolView() {
  const [input, setInput] = useState("# Hello\n\nThis is **Markdown**.");
  const [showPreview, setShowPreview] = useState(true);

  const rawHtml = useMemo(() => markdownToHtml(input), [input]);
  // Sanitization happens here, in the browser-only ToolView — not in
  // transform.ts, which must stay DOM-free (see transform.ts's docblock).
  const sanitizedHtml = useMemo(
    () => (typeof window !== "undefined" ? DOMPurify.sanitize(rawHtml) : rawHtml),
    [rawHtml],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <button
        onClick={() => setShowPreview((s) => !s)}
        className="w-fit rounded-sm border border-border-default px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-raised"
      >
        {showPreview ? "Show HTML source" : "Show preview"}
      </button>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex h-full flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Markdown</label>
          <CodeEditor
            value={input}
            onChange={(e) => setInput(e.target.value)}
            language="markdown"
            aria-label="Markdown input"
          />
        </div>
        {showPreview ? (
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Preview</label>
            <div
              className="flex-1 overflow-auto rounded-md border border-border-default bg-bg-base p-4 prose-sm"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              aria-live="polite"
            />
          </div>
        ) : (
          <OutputPane label="HTML" value={rawHtml} />
        )}
      </div>
    </div>
  );
}
