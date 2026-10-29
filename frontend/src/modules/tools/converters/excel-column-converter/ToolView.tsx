"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runExcelColumnConverter } from "./transform";
import type { ExcelColumnConverterOptions } from "./schema";

type Options = ExcelColumnConverterOptions;

const defaultOptions: Options = {"zeroBased":false} as Options;

export function ExcelColumnConverterToolView() {
  const [input, setInput] = useState("AB\n703\nB12\nR12C2\nSheet1!A1:C10\nXFD");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runExcelColumnConverter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.zeroBased} onChange={(e) => setOptions((o) => ({ ...o, zeroBased: e.target.checked }))} />
          0-based indexes
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Columns, cells or ranges (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="AB"
                aria-label="Columns, cells or ranges (one per line)"
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
