"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateToc } from "./transform";
import type { MarkdownTocGeneratorOptions } from "./schema";

type Options = MarkdownTocGeneratorOptions;

const defaultOptions: Options = {"minLevel":1,"maxLevel":3,"bullet":"dash","links":true} as Options;

export function MarkdownTocGeneratorToolView() {
  const [input, setInput] = useState("# My Project\n\n## Installation\n\n### Requirements\n\n## Usage\n\n### CLI\n\n### API\n\n## Contributing\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateToc(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min level
          <input
            type="number"
            min={1} max={6}
            value={options.minLevel}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minLevel: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max level
          <input
            type="number"
            min={1} max={6}
            value={options.maxLevel}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxLevel: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          List style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.bullet}
            onChange={(e) => setOptions((o) => ({ ...o, bullet: e.target.value as Options["bullet"] }))}
          >
            <option value="dash">{"- dashes"}</option>
            <option value="star">{"* stars"}</option>
            <option value="numbered">{"1. numbered"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.links} onChange={(e) => setOptions((o) => ({ ...o, links: e.target.checked }))} />
          Link to headings
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Markdown</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="# Title\n## Section"
                aria-label="Markdown"
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
