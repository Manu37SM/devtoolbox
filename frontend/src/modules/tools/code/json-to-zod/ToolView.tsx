"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { jsonToZod } from "./transform";
import type { JsonToZodOptions } from "./schema";

type Options = JsonToZodOptions;

const defaultOptions: Options = {"style":"named","detectFormats":true,"strict":false,"exportTypes":true} as Options;

export function JsonToZodToolView() {
  const [input, setInput] = useState("name: user\n{\"id\":\"3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e\",\"email\":\"ann@example.com\",\"age\":31,\"active\":true,\"createdAt\":\"2024-05-01T10:00:00Z\",\"address\":{\"city\":\"Pune\",\"zip\":null},\"tags\":[\"a\",\"b\"],\"orders\":[{\"sku\":\"X1\",\"qty\":2}]}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => jsonToZod(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.style}
            onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}
          >
            <option value="named">{"Named schemas"}</option>
            <option value="inline">{"Single inline schema"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.detectFormats} onChange={(e) => setOptions((o) => ({ ...o, detectFormats: e.target.checked }))} />
          Detect email, UUID, URL, date
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.strict} onChange={(e) => setOptions((o) => ({ ...o, strict: e.target.checked }))} />
          Strict objects
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.exportTypes} onChange={(e) => setOptions((o) => ({ ...o, exportTypes: e.target.checked }))} />
          Export inferred types
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON sample (optional first line: name: user)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="name: user"
                aria-label="JSON sample (optional first line: name: user)"
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
