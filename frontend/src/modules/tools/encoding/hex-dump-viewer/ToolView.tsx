"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { viewHexDump } from "./transform";
import type { HexDumpViewerOptions } from "./schema";

type Options = HexDumpViewerOptions;

const defaultOptions: Options = {"direction":"dump","inputFormat":"text","bytesPerLine":16,"uppercase":false} as Options;

export function HexDumpViewerToolView() {
  const [input, setInput] = useState("The quick brown fox jumps over the lazy dog");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => viewHexDump(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="dump">{"Bytes → dump"}</option>
            <option value="parse">{"Dump → bytes"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input is
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.inputFormat}
            onChange={(e) => setOptions((o) => ({ ...o, inputFormat: e.target.value as Options["inputFormat"] }))}
          >
            <option value="text">{"UTF-8 text"}</option>
            <option value="hex">{"Hex bytes"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Bytes per line
          <input
            type="number"
            min={4} max={64}
            value={options.bytesPerLine}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, bytesPerLine: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.uppercase} onChange={(e) => setOptions((o) => ({ ...o, uppercase: e.target.checked }))} />
          Uppercase
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="The quick brown fox"
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
