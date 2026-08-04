"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { htmlToJsx } from "./transform";
import type { HtmlJsxOptions } from "./schema";

export function HtmlJsxToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<HtmlJsxOptions>({ selfClosingVoidElements: true });
  const result = useMemo(() => htmlToJsx(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.selfClosingVoidElements}
            onChange={(e) => setOptions((o) => ({ ...o, selfClosingVoidElements: e.target.checked }))}
          />
          Self-close void elements
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">HTML</label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language="html"
                aria-label="HTML input"
                placeholder="<div class=&quot;card&quot;>...</div>"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} label="JSX" placeholder="JSX will appear here" />}
        />
      </div>
    </div>
  );
}
