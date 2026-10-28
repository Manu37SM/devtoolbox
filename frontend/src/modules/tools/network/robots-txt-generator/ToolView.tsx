"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateRobots } from "./transform";
import type { RobotsTxtGeneratorOptions } from "./schema";

type Options = RobotsTxtGeneratorOptions;

const defaultOptions: Options = {"preset":"standard","blockAiCrawlers":false,"crawlDelay":0} as Options;

export function RobotsTxtGeneratorToolView() {
  const [input, setInput] = useState("Disallow: /staging/\nSitemap: https://example.com/sitemap.xml");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateRobots(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Preset
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.preset}
            onChange={(e) => setOptions((o) => ({ ...o, preset: e.target.value as Options["preset"] }))}
          >
            <option value="allow-all">{"Allow all"}</option>
            <option value="block-all">{"Block all"}</option>
            <option value="standard">{"Standard (block admin/api/cart)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.blockAiCrawlers} onChange={(e) => setOptions((o) => ({ ...o, blockAiCrawlers: e.target.checked }))} />
          Block AI crawlers
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Crawl-delay (s)
          <input
            type="number"
            min={0} max={120}
            value={options.crawlDelay}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, crawlDelay: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Extra rules and sitemaps</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Disallow: /tmp/\nSitemap: https://example.com/sitemap.xml"
                aria-label="Extra rules and sitemaps"
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
