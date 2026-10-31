"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { rssAtomFeedGenerator } from "./transform";
import type { RssAtomFeedGeneratorOptions } from "./schema";

type Options = RssAtomFeedGeneratorOptions;

const defaultOptions: Options = {"format": "rss", "cdata": true, "extensions": true, "pretty": true, "declaration": true, "sortNewestFirst": true, "limit": 0, "generator": ""} as Options;

export function RssAtomFeedGeneratorToolView() {
  const [in0, setIn0] = useState("title: Example Blog\nlink: https://example.com/\ndescription: Notes on databases\nlanguage: en\nfeedUrl: https://example.com/feed.xml\n\ntitle: Tuning shared_buffers\nlink: https://example.com/posts/shared-buffers\ndate: 2026-03-04T08:00:00+05:30\ndescription: A quarter of RAM is a start.\ncontent: <p>Longer <b>HTML</b> body.</p>\nauthor: Jane Doe <jane@example.com>\ncategory: postgres\n\ntitle: Vacuum basics\nlink: https://example.com/posts/vacuum\ndate: 2026-02-10\ndescription: What autovacuum does.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => rssAtomFeedGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"rss"}>{"RSS 2.0"}</option>
            <option value={"atom"}>{"Atom 1.0"}</option>
            <option value={"json"}>{"JSON Feed 1.1"}</option>
          </select>
        </label>
        {["rss", "atom"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.cdata} onChange={(e) => setOptions((o) => ({ ...o, cdata: e.target.checked }))} />
          {"CDATA for HTML"}
        </label>
        )}
        {["rss"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.extensions} onChange={(e) => setOptions((o) => ({ ...o, extensions: e.target.checked }))} />
          {"Namespaces (content, dc, atom)"}
        </label>
        )}
        {["rss", "atom"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.declaration} onChange={(e) => setOptions((o) => ({ ...o, declaration: e.target.checked }))} />
          {"XML declaration"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.pretty} onChange={(e) => setOptions((o) => ({ ...o, pretty: e.target.checked }))} />
          {"Pretty print"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sortNewestFirst} onChange={(e) => setOptions((o) => ({ ...o, sortNewestFirst: e.target.checked }))} />
          {"Newest first"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max items (0 = all)"}
          <input type="number" min={0} max={1000} value={options.limit} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, limit: Math.min(1000, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        {["rss", "atom"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Generator"}
          <input type="text" value={options.generator} placeholder={"DevToolbox"} onChange={(e) => setOptions((o) => ({ ...o, generator: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Feed block, blank line, then one block per item"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"title: My Blog"}
                  aria-label={"Feed block, blank line, then one block per item"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Feed"} fileName={"feed.xml"} value={result.output} error={result.error?.message ?? null} placeholder={"Describe the feed, then add items"} />}
        />
      </div>
    </div>
  );
}
