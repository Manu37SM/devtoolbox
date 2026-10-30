"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertCsvTsv } from "./transform";
import type { CsvTsvOptions } from "./schema";

const defaultOptions: CsvTsvOptions = { mode: "csv-to-tsv", csvDelimiter: ",", quoteAll: false, trimFields: false, lineEnding: "lf" };

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
        {options.mode !== "clean" && (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          CSV separator
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.csvDelimiter}
            onChange={(e) => setOptions((o) => ({ ...o, csvDelimiter: e.target.value as CsvTsvOptions["csvDelimiter"] }))}
          >
            <option value=",">Comma ,</option>
            <option value=";">Semicolon ;</option>
            <option value="|">Pipe |</option>
          </select>
        </label>
          </>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.trimFields}
            onChange={(e) => setOptions((o) => ({ ...o, trimFields: e.target.checked }))}
          />
          Trim fields
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.quoteAll}
            onChange={(e) => setOptions((o) => ({ ...o, quoteAll: e.target.checked }))}
          />
          Quote all fields
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Line endings
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.lineEnding}
            onChange={(e) => setOptions((o) => ({ ...o, lineEnding: e.target.value as CsvTsvOptions["lineEnding"] }))}
          >
            <option value="lf">LF</option>
            <option value="crlf">CRLF (Excel)</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="a,b,c&#10;1,2,3"
                aria-label="CSV or TSV input"
              />
            </div>
          }
          output={
            <OutputPane
              onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "csv-to-tsv" ? "tsv-to-csv" : o.mode === "tsv-to-csv" ? "csv-to-tsv" : o.mode }))}
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
