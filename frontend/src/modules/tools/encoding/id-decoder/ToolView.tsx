"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { decodeId } from "./transform";
import type { IdDecoderOptions } from "./schema";

type Options = IdDecoderOptions;

const defaultOptions: Options = {"mode":"auto"} as Options;

export function IdDecoderToolView() {
  const [input, setInput] = useState("017f22e2-79b0-7cc3-98c4-dc0c0c07398f\n01ARZ3NDEKTSV4RRFFQ69G5FAV\n507f1f77bcf86cd799439011\n175928847299117063");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => decodeId(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="auto">{"Auto-detect"}</option>
            <option value="uuid">{"UUID"}</option>
            <option value="ulid">{"ULID"}</option>
            <option value="objectid">{"MongoDB ObjectId"}</option>
            <option value="twitter">{"Twitter/X snowflake"}</option>
            <option value="discord">{"Discord snowflake"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IDs (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="017f22e2-79b0-7cc3-98c4-dc0c0c07398f"
                aria-label="IDs (one per line)"
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
