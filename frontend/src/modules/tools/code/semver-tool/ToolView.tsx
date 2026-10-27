"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { runSemver } from "./transform";
import type { SemverToolOptions } from "./schema";

type Options = SemverToolOptions;

const defaultOptions: Options = {"action":"sort","sortOrder":"asc","bumpLevel":"patch","preid":"rc"} as Options;

export function SemverToolToolView() {
  const [input, setInput] = useState("1.10.0\n1.2.0\n1.2.0-rc.1\n2.0.0-beta.2\n1.9.9");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSemver(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["sort","Sort"],["compare","Compare"],["bump","Bump"],["validate","Validate"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.action === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, action: value as Options["action"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.action === "sort" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Order
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.sortOrder}
            onChange={(e) => setOptions((o) => ({ ...o, sortOrder: e.target.value as Options["sortOrder"] }))}
          >
            <option value="asc">{"Oldest first"}</option>
            <option value="desc">{"Newest first"}</option>
          </select>
        </label>
        )}
        {options.action === "bump" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Bump
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.bumpLevel}
            onChange={(e) => setOptions((o) => ({ ...o, bumpLevel: e.target.value as Options["bumpLevel"] }))}
          >
            <option value="major">{"major"}</option>
            <option value="minor">{"minor"}</option>
            <option value="patch">{"patch"}</option>
            <option value="premajor">{"premajor"}</option>
            <option value="preminor">{"preminor"}</option>
            <option value="prepatch">{"prepatch"}</option>
            <option value="prerelease">{"prerelease"}</option>
          </select>
        </label>
        )}
        {options.action === "bump" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Pre-release id
          <input
            type="text"
            value={options.preid}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, preid: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Versions (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Versions (one per line)"
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
