"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { checkCommit } from "./transform";
import type { ConventionalCommitLinterOptions } from "./schema";

type Options = ConventionalCommitLinterOptions;

const defaultOptions: Options = {"maxHeader":72,"strictTypes":true} as Options;

export function ConventionalCommitLinterToolView() {
  const [input, setInput] = useState("feat(api)!: add cursor pagination to list endpoints\n\nOffset pagination was too slow on large tables.\n\nBREAKING CHANGE: the `page` query parameter was removed\nRefs: #123");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => checkCommit(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max header length
          <input
            type="number"
            min={20} max={200}
            value={options.maxHeader}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxHeader: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.strictTypes} onChange={(e) => setOptions((o) => ({ ...o, strictTypes: e.target.checked }))} />
          Only standard types
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Commit message</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="feat(api): add pagination"
                aria-label="Commit message"
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
