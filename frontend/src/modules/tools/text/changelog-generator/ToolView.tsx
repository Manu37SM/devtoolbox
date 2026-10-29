"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runChangelogGenerator } from "./transform";
import type { ChangelogGeneratorOptions } from "./schema";

type Options = ChangelogGeneratorOptions;

const defaultOptions: Options = {"currentVersion":"1.4.2","repoUrl":"","includeOther":false} as Options;

export function ChangelogGeneratorToolView() {
  const [input, setInput] = useState("a1b2c3d feat(api): add order search (#42)\nb2c3d4e fix: handle null currency\nc3d4e5f feat(auth)!: drop legacy session tokens\nd4e5f6a docs: update README\ne5f6a7b Merge pull request #41 from acme/feature\nf6a7b8c chore(deps): bump spring boot to 3.4.1\n0a1b2c3 perf(db): batch inserts for statements");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runChangelogGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Current version
          <input
            type="text"
            value={options.currentVersion}
            onChange={(e) => setOptions((o) => ({ ...o, currentVersion: e.target.value }))}
            placeholder="1.4.2"
            aria-label="Current version"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Repo URL
          <input
            type="text"
            value={options.repoUrl}
            onChange={(e) => setOptions((o) => ({ ...o, repoUrl: e.target.value }))}
            placeholder="https://github.com/org/repo"
            aria-label="Repo URL"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeOther} onChange={(e) => setOptions((o) => ({ ...o, includeOther: e.target.checked }))} />
          Include all types
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">git log --oneline (or full git log)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="a1b2c3d feat: add search"
                aria-label="git log --oneline (or full git log)"
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
