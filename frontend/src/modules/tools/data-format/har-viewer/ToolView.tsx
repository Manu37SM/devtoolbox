"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { viewHar } from "./transform";
import type { HarViewerOptions } from "./schema";

type Options = HarViewerOptions;

const defaultOptions: Options = {"sortBy":"order","onlyErrors":false,"maxRows":200} as Options;

export function HarViewerToolView() {
  const [input, setInput] = useState("{\"log\":{\"version\":\"1.2\",\"creator\":{\"name\":\"Example\",\"version\":\"1.0\"},\"entries\":[{\"startedDateTime\":\"2024-01-01T00:00:00.000Z\",\"time\":120,\"request\":{\"method\":\"GET\",\"url\":\"https://example.com/\"},\"response\":{\"status\":200,\"statusText\":\"OK\",\"headersSize\":300,\"bodySize\":5120,\"content\":{\"size\":5120,\"mimeType\":\"text/html\"}}},{\"startedDateTime\":\"2024-01-01T00:00:00.200Z\",\"time\":2400,\"request\":{\"method\":\"GET\",\"url\":\"https://example.com/app.js\"},\"response\":{\"status\":200,\"statusText\":\"OK\",\"headersSize\":250,\"bodySize\":204800,\"content\":{\"size\":204800,\"mimeType\":\"application/javascript\"}}},{\"startedDateTime\":\"2024-01-01T00:00:00.300Z\",\"time\":45,\"request\":{\"method\":\"GET\",\"url\":\"https://example.com/missing.png\"},\"response\":{\"status\":404,\"statusText\":\"Not Found\",\"headersSize\":200,\"bodySize\":0,\"content\":{\"size\":0,\"mimeType\":\"image/png\"}}}]}}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => viewHar(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Sort by
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.sortBy}
            onChange={(e) => setOptions((o) => ({ ...o, sortBy: e.target.value as Options["sortBy"] }))}
          >
            <option value="order">{"Order"}</option>
            <option value="time">{"Slowest"}</option>
            <option value="size">{"Largest"}</option>
            <option value="status">{"Status"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.onlyErrors} onChange={(e) => setOptions((o) => ({ ...o, onlyErrors: e.target.checked }))} />
          Only failed requests
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max rows
          <input
            type="number"
            min={1} max={5000}
            value={options.maxRows}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxRows: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">HAR JSON</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"log\":{\"entries\":[...]}}"}
                aria-label="HAR JSON"
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
