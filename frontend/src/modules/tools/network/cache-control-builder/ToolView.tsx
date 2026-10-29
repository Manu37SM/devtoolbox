"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { buildCacheControl } from "./transform";
import type { CacheControlBuilderOptions } from "./schema";

type Options = CacheControlBuilderOptions;

const defaultOptions: Options = {"visibility":"public","maxAge":3600,"sMaxAge":-1,"staleWhileRevalidate":0,"staleIfError":0,"noCache":false,"noStore":false,"mustRevalidate":false,"immutable":false,"noTransform":false} as Options;

export function CacheControlBuilderToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildCacheControl(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Visibility
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.visibility}
            onChange={(e) => setOptions((o) => ({ ...o, visibility: e.target.value as Options["visibility"] }))}
          >
            <option value="public">{"public"}</option>
            <option value="private">{"private"}</option>
            <option value="unspecified">{"unspecified"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          max-age (s)
          <input
            type="number"
            min={0} max={315360000}
            value={options.maxAge}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxAge: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          s-maxage (s, -1 = off)
          <input
            type="number"
            min={-1} max={315360000}
            value={options.sMaxAge}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, sMaxAge: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          stale-while-revalidate (s)
          <input
            type="number"
            min={0} max={31536000}
            value={options.staleWhileRevalidate}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, staleWhileRevalidate: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          stale-if-error (s)
          <input
            type="number"
            min={0} max={31536000}
            value={options.staleIfError}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, staleIfError: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noCache} onChange={(e) => setOptions((o) => ({ ...o, noCache: e.target.checked }))} />
          no-cache
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noStore} onChange={(e) => setOptions((o) => ({ ...o, noStore: e.target.checked }))} />
          no-store
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mustRevalidate} onChange={(e) => setOptions((o) => ({ ...o, mustRevalidate: e.target.checked }))} />
          must-revalidate
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.immutable} onChange={(e) => setOptions((o) => ({ ...o, immutable: e.target.checked }))} />
          immutable
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noTransform} onChange={(e) => setOptions((o) => ({ ...o, noTransform: e.target.checked }))} />
          no-transform
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Existing header to explain (optional)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="public, max-age=31536000, immutable"
                aria-label="Existing header to explain (optional)"
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
