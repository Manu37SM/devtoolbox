"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runPackedDecimalConverter } from "./transform";
import type { PackedDecimalConverterOptions } from "./schema";

type Options = PackedDecimalConverterOptions;

const defaultOptions: Options = {"direction":"decode","format":"comp-3","pic":"S9(7)V99"} as Options;

export function PackedDecimalConverterToolView() {
  const [input, setInput] = useState("001234567C\n001234567D\n000000000F");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runPackedDecimalConverter(input, options), [input, options]);

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
            <option value="decode">{"Hex to number"}</option>
            <option value="encode">{"Number to hex"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="comp-3">{"COMP-3 (packed)"}</option>
            <option value="zoned">{"Zoned DISPLAY"}</option>
            <option value="comp">{"COMP (binary)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          PIC
          <input
            type="text"
            value={options.pic}
            onChange={(e) => setOptions((o) => ({ ...o, pic: e.target.value }))}
            placeholder="S9(7)V99"
            aria-label="PIC"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Values (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="001234567C"
                aria-label="Values (one per line)"
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
