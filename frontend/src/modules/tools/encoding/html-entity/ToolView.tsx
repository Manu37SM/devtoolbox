"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { transformHtmlEntity } from "./transform";
import type { HtmlEntityOptions } from "./schema";

export function HtmlEntityToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<HtmlEntityOptions>({
    mode: "encode",
    encodeAllNonAscii: false,
    entityStyle: "basic",
    escapeQuotes: true,
  });

  const result = useMemo(() => transformHtmlEntity(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "encode" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "encode" }))}
          >
            Encode
          </Button>
          <Button
            variant={options.mode === "decode" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "decode" }))}
          >
            Decode
          </Button>
        </div>
        {options.mode === "encode" && (
          <>
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.encodeAllNonAscii}
              onChange={(e) => setOptions((o) => ({ ...o, encodeAllNonAscii: e.target.checked }))}
            />
            Encode all non-ASCII
          </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.entityStyle}
            onChange={(e) => setOptions((o) => ({ ...o, entityStyle: e.target.value as HtmlEntityOptions["entityStyle"] }))}
          >
            <option value="basic">Basic named + numeric</option>
            <option value="named">Named (&amp;copy;)</option>
            <option value="decimal">Decimal (&amp;#169;)</option>
            <option value="hex">Hex (&amp;#xA9;)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.escapeQuotes}
            onChange={(e) => setOptions((o) => ({ ...o, escapeQuotes: e.target.checked }))}
          />
          Escape quotes
        </label>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="HTML entity input"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "encode" ? "decode" : o.mode === "decode" ? "encode" : o.mode }))} value={result.output} error={result.error?.message ?? null} />}
        />
      </div>
    </div>
  );
}
