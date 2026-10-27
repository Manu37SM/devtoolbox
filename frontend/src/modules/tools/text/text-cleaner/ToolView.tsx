"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { cleanText } from "./transform";
import type { TextCleanerOptions } from "./schema";

type Options = TextCleanerOptions;

const defaultOptions: Options = {"trimLines":true,"collapseSpaces":true,"removeEmptyLines":false,"collapseEmptyLines":false,"stripHtml":false,"removeAccents":false,"straightenQuotes":false,"removeInvisible":true} as Options;

export function TextCleanerToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => cleanText(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trimLines} onChange={(e) => setOptions((o) => ({ ...o, trimLines: e.target.checked }))} />
          Trim lines
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.collapseSpaces} onChange={(e) => setOptions((o) => ({ ...o, collapseSpaces: e.target.checked }))} />
          Collapse spaces
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeEmptyLines} onChange={(e) => setOptions((o) => ({ ...o, removeEmptyLines: e.target.checked }))} />
          Remove empty lines
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.collapseEmptyLines} onChange={(e) => setOptions((o) => ({ ...o, collapseEmptyLines: e.target.checked }))} />
          Collapse blank runs
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripHtml} onChange={(e) => setOptions((o) => ({ ...o, stripHtml: e.target.checked }))} />
          Strip HTML
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeAccents} onChange={(e) => setOptions((o) => ({ ...o, removeAccents: e.target.checked }))} />
          Remove accents
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.straightenQuotes} onChange={(e) => setOptions((o) => ({ ...o, straightenQuotes: e.target.checked }))} />
          Straighten quotes
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeInvisible} onChange={(e) => setOptions((o) => ({ ...o, removeInvisible: e.target.checked }))} />
          Remove invisible chars
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
                
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
