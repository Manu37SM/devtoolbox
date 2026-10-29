"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runSubtitleConverter } from "./transform";
import type { SubtitleConverterOptions } from "./schema";

type Options = SubtitleConverterOptions;

const defaultOptions: Options = {"target":"vtt","shiftMs":0} as Options;

export function SubtitleConverterToolView() {
  const [input, setInput] = useState("1\n00:00:01,000 --> 00:00:02,500\nHello there\n\n2\n00:00:03,000 --> 00:00:05,250\nSecond line\nwraps");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSubtitleConverter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Convert to
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.target}
            onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as Options["target"] }))}
          >
            <option value="vtt">{"WebVTT"}</option>
            <option value="srt">{"SRT"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Shift (ms)
          <input
            type="number"
            min={-3600000} max={3600000}
            value={options.shiftMs}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, shiftMs: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">SRT or WebVTT</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"1\n00:00:01,000 --> 00:00:02,500\nHello"}
                aria-label="SRT or WebVTT"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, target: o.target === "vtt" ? "srt" : o.target === "srt" ? "vtt" : o.target }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
