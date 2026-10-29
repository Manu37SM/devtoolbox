"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJsonPatch } from "./transform";
import type { JsonPatchToolOptions } from "./schema";

type Options = JsonPatchToolOptions;

const defaultOptions: Options = {"mode":"apply","indent":2} as Options;

export function JsonPatchToolToolView() {
  const [input, setInput] = useState("{\"name\":\"web\",\"replicas\":1,\"tags\":[\"a\",\"b\"]}\n---\n[\n  {\"op\":\"replace\",\"path\":\"/replicas\",\"value\":3},\n  {\"op\":\"add\",\"path\":\"/tags/-\",\"value\":\"c\"},\n  {\"op\":\"remove\",\"path\":\"/name\"}\n]");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJsonPatch(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="apply">{"Apply patch"}</option>
            <option value="diff">{"Generate patch"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <input
            type="number"
            min={0} max={8}
            value={options.indent}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, indent: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Two JSON documents separated by a --- line (document then patch, or before then after)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"a\":1}\n---\n[{\"op\":\"add\",\"path\":\"/b\",\"value\":2}]"}
                aria-label="Two JSON documents separated by a --- line (document then patch, or before then after)"
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
