"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertStringEscape } from "./transform";
import type { StringEscapeOptions } from "./schema";

type Options = StringEscapeOptions;

const defaultOptions: Options = {"mode":"escape","language":"json"} as Options;

export function StringEscapeToolView() {
  const [input, setInput] = useState("He said \"hi\"\nit's fine");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertStringEscape(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["escape","Escape"],["unescape","Unescape"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Language
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.language}
            onChange={(e) => setOptions((o) => ({ ...o, language: e.target.value as Options["language"] }))}
          >
            <option value="json">{"JSON"}</option>
            <option value="javascript">{"JavaScript"}</option>
            <option value="java">{"Java"}</option>
            <option value="sql">{"SQL"}</option>
            <option value="regex">{"Regex"}</option>
            <option value="csv">{"CSV"}</option>
            <option value="shell">{"Shell"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Input"
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
