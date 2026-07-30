"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertJsonCsv } from "./transform";
import type { JsonCsvOptions } from "./schema";

export function JsonCsvToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonCsvOptions>({
    mode: "json-to-csv",
    delimiter: ",",
    flattenNested: true,
  });

  const result = useMemo(() => convertJsonCsv(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "json-to-csv" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "json-to-csv" }))}
          >
            JSON → CSV
          </Button>
          <Button
            variant={options.mode === "csv-to-json" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "csv-to-json" }))}
          >
            CSV → JSON
          </Button>
        </div>
        {options.mode === "json-to-csv" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.flattenNested}
              onChange={(e) => setOptions((o) => ({ ...o, flattenNested: e.target.checked }))}
            />
            Flatten nested objects
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <select
            value={options.delimiter}
            onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as "," | ";" | "\t" }))}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          >
            <option value=",">Comma</option>
            <option value=";">Semicolon</option>
            <option value={"\t"}>Tab</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">
                {options.mode === "json-to-csv" ? "JSON array" : "CSV"}
              </label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Input" />
            </div>
          }
          output={
            <OutputPane
              label={options.mode === "json-to-csv" ? "CSV" : "JSON"}
              value={result.output}
              error={result.error?.message ?? null}
            />
          }
        />
      </div>
    </div>
  );
}
