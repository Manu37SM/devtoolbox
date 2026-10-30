"use client";

import { useMemo, useState } from "react";
import DOMPurify from "dompurify";
import { OutputPane } from "@/components/tools/OutputPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { markdownToHtml } from "./transform";
import { markdownHtmlOptionsSchema, type MarkdownHtmlOptions } from "./schema";

export function MarkdownHtmlToolView() {
  const [input, setInput] = useState("# Hello\n\nThis is **Markdown**.");
  const [showPreview, setShowPreview] = useState(true);

  const [options, setOptions] = useState<MarkdownHtmlOptions>(() => markdownHtmlOptionsSchema.parse({}));
  const rawHtml = useMemo(() => markdownToHtml(input, options), [input, options]);
  // The preview always shows the body; a full document's <head> would be stripped anyway.
  const previewHtml = useMemo(() => markdownToHtml(input, { ...options, fullDocument: false }), [input, options]);

  const sanitizedHtml = useMemo(
    () => (typeof window !== "undefined" ? DOMPurify.sanitize(previewHtml) : previewHtml),
    [previewHtml],
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={() => setShowPreview((s) => !s)}
          className="w-fit rounded-sm border border-border-default px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-bg-raised"
        >
          {showPreview ? "Show HTML source" : "Show preview"}
        </button>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.gfm}
            onChange={(e) => setOptions((o) => ({ ...o, gfm: e.target.checked }))}
          />
          GFM (tables, task lists, ~~strike~~, autolinks)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.headingIds}
            onChange={(e) => setOptions((o) => ({ ...o, headingIds: e.target.checked }))}
          />
          Heading anchors
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.hardBreaks}
            onChange={(e) => setOptions((o) => ({ ...o, hardBreaks: e.target.checked }))}
          />
          Line breaks → {"<br>"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.externalLinks}
            onChange={(e) => setOptions((o) => ({ ...o, externalLinks: e.target.checked }))}
          />
          Links open in new tab
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.safeUrls}
            onChange={(e) => setOptions((o) => ({ ...o, safeUrls: e.target.checked }))}
          />
          Block javascript: URLs
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.fullDocument}
            onChange={(e) => setOptions((o) => ({ ...o, fullDocument: e.target.checked }))}
          />
          Full HTML document
        </label>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex h-full flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Markdown</label>
          <ToolInput
            as="code"
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
