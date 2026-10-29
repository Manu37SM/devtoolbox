"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { checkContrast } from "./transform";
import type { ColorContrastCheckerOptions } from "./schema";

type Options = ColorContrastCheckerOptions;

const defaultOptions: Options = {"includeUi":false} as Options;

export function ColorContrastCheckerToolView() {
  const [input, setInput] = useState("#767676 on #ffffff\n#1a1a1a on #ffffff");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => checkContrast(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeUi} onChange={(e) => setOptions((o) => ({ ...o, includeUi: e.target.checked }))} />
          Include UI components (3:1)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Foreground and background (one pair per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="#1a1a1a on #ffffff"
                aria-label="Foreground and background (one pair per line)"
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
