"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { generateIds } from "./transform";
import type { UlidNanoidGeneratorOptions } from "./schema";

type Options = UlidNanoidGeneratorOptions;

const defaultOptions: Options = {"mode":"generate","kind":"ulid","count":5,"length":21,"alphabet":"","lowercase":false} as Options;

export function UlidNanoidGeneratorToolView() {
  const [input, setInput] = useState("01ARYZ6S410000000000000000");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generateIds(input, options, nonce), [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["generate","Generate"],["decode","Decode ULID"]] as const).map(([value, label]) => (
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
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.kind}
            onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}
          >
            <option value="ulid">{"ULID"}</option>
            <option value="nanoid">{"NanoID"}</option>
          </select>
        </label>
        )}
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1} max={1000}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.mode === "generate" && options.kind === "nanoid" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Length
          <input
            type="number"
            min={1} max={256}
            value={options.length}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, length: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.mode === "generate" && options.kind === "nanoid" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Alphabet
          <input
            type="text"
            value={options.alphabet}
            placeholder="default URL-safe"
            onChange={(e) => setOptions((o) => ({ ...o, alphabet: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.mode === "generate" && options.kind === "ulid" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lowercase} onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))} />
          Lowercase
        </label>
        )}
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">ULIDs to decode (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="ULIDs to decode (one per line)"
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
