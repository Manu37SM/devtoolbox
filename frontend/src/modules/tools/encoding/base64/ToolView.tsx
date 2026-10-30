"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { transformBase64 } from "./transform";
import type { Base64Options } from "./schema";

export function Base64ToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Base64Options>({ mode: "encode", urlSafe: false, inputFormat: "text", decodeAs: "auto", lineLength: 0, padding: "auto" });

  const result = useMemo(() => transformBase64(input, options), [input, options]);

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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.urlSafe}
            onChange={(e) => setOptions((o) => ({ ...o, urlSafe: e.target.checked }))}
          />
          URL-safe
        </label>
        {options.mode === "encode" ? (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.inputFormat}
            onChange={(e) => setOptions((o) => ({ ...o, inputFormat: e.target.value as Base64Options["inputFormat"] }))}
          >
            <option value="text">Text (UTF-8)</option>
            <option value="hex">Hex bytes</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Line length
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.lineLength)}
            onChange={(e) => setOptions((o) => ({ ...o, lineLength: (Number(e.target.value) as 0 | 64 | 76) }))}
          >
            <option value="0">One line</option>
            <option value="64">64 (PEM)</option>
            <option value="76">76 (MIME)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Padding
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.padding}
            onChange={(e) => setOptions((o) => ({ ...o, padding: e.target.value as Base64Options["padding"] }))}
          >
            <option value="auto">Auto</option>
            <option value="always">Always =</option>
            <option value="never">None</option>
          </select>
        </label>
          </>
        ) : (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Show result as
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.decodeAs}
            onChange={(e) => setOptions((o) => ({ ...o, decodeAs: e.target.value as Base64Options["decodeAs"] }))}
          >
            <option value="auto">Auto (text or hex)</option>
            <option value="text">Text</option>
            <option value="hex">Hex</option>
          </select>
        </label>
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
                placeholder={options.mode === "encode" ? "Text to encode" : "Base64 to decode"}
                aria-label="Base64 input"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "encode" ? "decode" : o.mode === "decode" ? "encode" : o.mode }))} value={result.output} error={result.error?.message ?? null} />}
        />
      </div>
    </div>
  );
}
