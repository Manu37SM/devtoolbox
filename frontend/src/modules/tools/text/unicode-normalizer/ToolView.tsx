"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runUnicodeNormalizer } from "./transform";
import type { UnicodeNormalizerOptions } from "./schema";

type Options = UnicodeNormalizerOptions;

const defaultOptions: Options = {"form":"NFC","stripDiacritics":false,"removeInvisible":false,"straightenQuotes":false,"collapseSpaces":false} as Options;

export function UnicodeNormalizerToolView() {
  const [input, setInput] = useState("Café “smart quotes” – and\u00a0odd\u200bspaces");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runUnicodeNormalizer(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Form
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.form}
            onChange={(e) => setOptions((o) => ({ ...o, form: e.target.value as Options["form"] }))}
          >
            <option value="NFC">{"NFC"}</option>
            <option value="NFD">{"NFD"}</option>
            <option value="NFKC">{"NFKC"}</option>
            <option value="NFKD">{"NFKD"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripDiacritics} onChange={(e) => setOptions((o) => ({ ...o, stripDiacritics: e.target.checked }))} />
          Strip accents
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeInvisible} onChange={(e) => setOptions((o) => ({ ...o, removeInvisible: e.target.checked }))} />
          Remove invisible characters
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.straightenQuotes} onChange={(e) => setOptions((o) => ({ ...o, straightenQuotes: e.target.checked }))} />
          Straighten quotes and dashes
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.collapseSpaces} onChange={(e) => setOptions((o) => ({ ...o, collapseSpaces: e.target.checked }))} />
          Collapse odd spaces
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste text..."
                aria-label="Text"
                className=""
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
