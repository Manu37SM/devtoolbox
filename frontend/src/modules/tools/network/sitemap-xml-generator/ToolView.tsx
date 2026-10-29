"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateSitemap } from "./transform";
import type { SitemapXmlGeneratorOptions } from "./schema";

type Options = SitemapXmlGeneratorOptions;

const defaultOptions: Options = {"changefreq":"none","priority":"none","dedupe":true} as Options;

export function SitemapXmlGeneratorToolView() {
  const [input, setInput] = useState("https://example.com/ 2024-01-15\nhttps://example.com/about\nhttps://example.com/blog?page=2&sort=new 2024-02-01");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateSitemap(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Change frequency
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.changefreq}
            onChange={(e) => setOptions((o) => ({ ...o, changefreq: e.target.value as Options["changefreq"] }))}
          >
            <option value="none">{"Omit"}</option>
            <option value="always">{"always"}</option>
            <option value="hourly">{"hourly"}</option>
            <option value="daily">{"daily"}</option>
            <option value="weekly">{"weekly"}</option>
            <option value="monthly">{"monthly"}</option>
            <option value="yearly">{"yearly"}</option>
            <option value="never">{"never"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Priority
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.priority}
            onChange={(e) => setOptions((o) => ({ ...o, priority: e.target.value as Options["priority"] }))}
          >
            <option value="none">{"Omit"}</option>
            <option value="1.0">{"1.0"}</option>
            <option value="0.8">{"0.8"}</option>
            <option value="0.5">{"0.5"}</option>
            <option value="0.3">{"0.3"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          Remove duplicates
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">URLs (one per line, optional lastmod after a space)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://example.com/ 2024-01-15"
                aria-label="URLs (one per line, optional lastmod after a space)"
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
