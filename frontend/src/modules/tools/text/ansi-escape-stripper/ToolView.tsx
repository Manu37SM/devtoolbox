"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runAnsi } from "./transform";
import type { AnsiEscapeStripperOptions } from "./schema";

type Options = AnsiEscapeStripperOptions;

const defaultOptions: Options = {"mode":"strip","stripCarriageReturns":true} as Options;

export function AnsiEscapeStripperToolView() {
  const [input, setInput] = useState("\\x1b[1;32m✓\\x1b[0m build passed\n\\x1b[31mERROR\\x1b[0m failed to compile \\x1b[4mmain.ts\\x1b[0m");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runAnsi(input, options), [input, options]);

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
            <option value="strip">{"Strip codes"}</option>
            <option value="html">{"Render as HTML"}</option>
            <option value="inspect">{"Inspect sequences"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripCarriageReturns} onChange={(e) => setOptions((o) => ({ ...o, stripCarriageReturns: e.target.checked }))} />
          Normalize CRLF
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Terminal output</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"\\x1b[31mred\\x1b[0m"}
                aria-label="Terminal output"
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
