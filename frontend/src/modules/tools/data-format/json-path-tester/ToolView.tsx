"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { runJsonPath } from "./transform";
import type { JsonPathTesterOptions } from "./schema";

export function JsonPathTesterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonPathTesterOptions>({ expression: "@", indent: 2 });

  const result = useMemo(() => runJsonPath(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex flex-1 items-center gap-2 text-sm text-text-secondary">
          Expression
          <input
            type="text"
            value={options.expression}
            onChange={(e) => setOptions((o) => ({ ...o, expression: e.target.value }))}
            placeholder="e.g. items[?active].name"
            className="flex-1 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm font-mono"
            aria-label="JMESPath expression"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON Input</label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language="json"
                placeholder='{"items":[{"id":1,"active":true}]}'
                aria-label="JSON input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Query result will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
