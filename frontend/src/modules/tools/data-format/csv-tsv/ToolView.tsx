"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertCsvTsv } from "./transform";
import type { CsvTsvOptions } from "./schema";

const defaultOptions: CsvTsvOptions = { mode: "csv-to-tsv" };

export function CsvTsvToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CsvTsvOptions>(defaultOptions);

  const result = useMemo(() => convertCsvTsv(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "csv-to-tsv" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "csv-to-tsv" }))}
          >
            CSV → TSV
          </Button>
          <Button
            variant={options.mode === "tsv-to-csv" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "tsv-to-csv" }))}
          >
            TSV → CSV
          </Button>
          <Button
            variant={options.mode === "clean" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "clean" }))}
          >
            Clean
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="a,b,c&#10;1,2,3"
                aria-label="CSV or TSV input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Converted output will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
