"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runAsciiTable } from "./transform";
import type { AsciiTableParserOptions } from "./schema";

type Options = AsciiTableParserOptions;

const defaultOptions: Options = {"output":"json","inferTypes":true} as Options;

export function AsciiTableParserToolView() {
  const [input, setInput] = useState("NAME                     READY   STATUS    RESTARTS   AGE\nweb-7d4b9c6f5-abcde      1/1     Running   0          3d\ndb-0                     0/1     Pending   2          5m");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runAsciiTable(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="json">{"JSON"}</option>
            <option value="csv">{"CSV"}</option>
            <option value="tsv">{"TSV"}</option>
            <option value="yaml">{"YAML"}</option>
            <option value="markdown">{"Markdown"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inferTypes} onChange={(e) => setOptions((o) => ({ ...o, inferTypes: e.target.checked }))} />
          Infer numbers and booleans
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Paste a table</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="NAME   READY   STATUS"
                aria-label="Paste a table"
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
