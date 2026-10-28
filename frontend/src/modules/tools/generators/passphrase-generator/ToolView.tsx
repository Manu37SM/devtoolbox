"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { Button } from "@/components/ui/button";

import { generatePassphrases } from "./transform";
import type { PassphraseGeneratorOptions } from "./schema";

type Options = PassphraseGeneratorOptions;

const defaultOptions: Options = {"words":6,"count":5,"separator":"hyphen","capitalize":false,"addNumber":false} as Options;

export function PassphraseGeneratorToolView() {
  const [input] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generatePassphrases(input, options, nonce), [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Words
          <input
            type="number"
            min={3} max={20}
            value={options.words}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, words: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          How many
          <input
            type="number"
            min={1} max={20}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Separator
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.separator}
            onChange={(e) => setOptions((o) => ({ ...o, separator: e.target.value as Options["separator"] }))}
          >
            <option value="hyphen">{"Hyphen -"}</option>
            <option value="space">{"Space"}</option>
            <option value="dot">{"Dot ."}</option>
            <option value="underscore">{"Underscore _"}</option>
            <option value="none">{"None"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.capitalize} onChange={(e) => setOptions((o) => ({ ...o, capitalize: e.target.checked }))} />
          Capitalize words
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.addNumber} onChange={(e) => setOptions((o) => ({ ...o, addNumber: e.target.checked }))} />
          Add a digit
        </label>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="Passphrases" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
