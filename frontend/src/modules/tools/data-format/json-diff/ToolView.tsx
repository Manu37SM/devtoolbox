"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { diffJson } from "./transform";
import type { JsonDiffOptions } from "./schema";

export function JsonDiffToolView() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [options, setOptions] = useState<JsonDiffOptions>({ ignoreArrayOrder: false, ignorePaths: "", ignoreCase: false, numericTolerance: 0, output: "summary" });

  const result = useMemo(() => diffJson(before, after, options), [before, after, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreArrayOrder}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreArrayOrder: e.target.checked }))}
          />
          Ignore array order (primitive arrays)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreCase}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))}
          />
          Ignore string case
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Number tolerance
          <input
            type="number"
            min={0}
            step="any"
            value={options.numericTolerance}
            onChange={(e) => setOptions((o) => ({ ...o, numericTolerance: Math.max(0, Number(e.target.value) || 0) }))}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as JsonDiffOptions["output"] }))}
          >
            <option value="summary">Change list</option>
            <option value="patch">JSON Patch (RFC 6902)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Ignore
          <input
            type="text"
            value={options.ignorePaths}
            placeholder="updatedAt, meta.requestId, items[*].etag"
            onChange={(e) => setOptions((o) => ({ ...o, ignorePaths: e.target.value }))}
            className="w-72 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">Before</label>
                <ToolInput
                  as="code"
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                  language="json"
                  aria-label="Before JSON"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">After</label>
                <ToolInput
                  as="code"
                  value={after}
                  onChange={(e) => setAfter(e.target.value)}
                  language="json"
                  aria-label="After JSON"
                />
              </div>
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Structural diff will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
