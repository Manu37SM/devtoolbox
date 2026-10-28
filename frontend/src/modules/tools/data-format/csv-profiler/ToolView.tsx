"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { profileCsv } from "./transform";
import type { CsvProfilerOptions } from "./schema";

type Options = CsvProfilerOptions;

const defaultOptions: Options = {"delimiter":"auto","topValues":3} as Options;

export function CsvProfilerToolView() {
  const [input, setInput] = useState("id,name,age,score,joined,active\n1,Alice,30,88.5,2024-01-05,true\n2,Bob,25,92.25,2024-02-10,false\n3,Alice,,70,2023-12-31,true\n4,\"Smith, J\",41,81,2024-03-01,yes");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => profileCsv(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.delimiter}
            onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as Options["delimiter"] }))}
          >
            <option value="auto">{"Auto-detect"}</option>
            <option value=",">{"Comma"}</option>
            <option value=";">{"Semicolon"}</option>
            <option value="\t">{"Tab"}</option>
            <option value="|">{"Pipe"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Top values
          <input
            type="number"
            min={0} max={10}
            value={options.topValues}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, topValues: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">CSV (first row is the header)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"id,name\n1,Ann"}
                aria-label="CSV (first row is the header)"
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
