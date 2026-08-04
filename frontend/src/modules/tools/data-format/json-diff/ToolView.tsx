"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { diffJson } from "./transform";
import type { JsonDiffOptions } from "./schema";

export function JsonDiffToolView() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [options, setOptions] = useState<JsonDiffOptions>({ ignoreArrayOrder: false });

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
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">Before</label>
                <CodeEditor
                  value={before}
                  onChange={(e) => setBefore(e.target.value)}
                  language="json"
                  aria-label="Before JSON"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">After</label>
                <CodeEditor
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
