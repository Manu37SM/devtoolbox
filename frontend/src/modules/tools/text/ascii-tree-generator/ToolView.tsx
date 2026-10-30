"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { buildAsciiTree } from "./transform";
import type { AsciiTreeGeneratorOptions } from "./schema";

type Options = AsciiTreeGeneratorOptions;

const defaultOptions: Options = {"inputFormat": "auto", "output": "tree", "charset": "unicode", "sort": "none", "trailingSlash": true, "rootName": "", "maxDepth": 0, "summary": false} as Options;

export function AsciiTreeGeneratorToolView() {
  const [in0, setIn0] = useState("src/main/java/com/acme/App.java\nsrc/main/resources/application.yml\nsrc/test/java/com/acme/AppTest.java\npom.xml\nREADME.md");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildAsciiTree(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Input"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.inputFormat} onChange={(e) => setOptions((o) => ({ ...o, inputFormat: e.target.value as Options["inputFormat"] }))}>
            <option value="auto">{"Auto-detect"}</option>
            <option value="paths">{"Paths"}</option>
            <option value="indent">{"Indented outline"}</option>
            <option value="tree">{"tree output"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value="tree">{"Tree"}</option>
            <option value="paths">{"Flat paths"}</option>
            <option value="markdown">{"Markdown list"}</option>
            <option value="json">{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Lines"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.charset} onChange={(e) => setOptions((o) => ({ ...o, charset: e.target.value as Options["charset"] }))}>
            <option value="unicode">{"Unicode \u251c\u2500\u2500"}</option>
            <option value="ascii">{"ASCII |--"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Sort"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.sort} onChange={(e) => setOptions((o) => ({ ...o, sort: e.target.value as Options["sort"] }))}>
            <option value="none">{"Input order"}</option>
            <option value="alpha">{"A\u2013Z"}</option>
            <option value="folders-first">{"Folders first"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trailingSlash} onChange={(e) => setOptions((o) => ({ ...o, trailingSlash: e.target.checked }))} />
          {"Folder slash"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.summary} onChange={(e) => setOptions((o) => ({ ...o, summary: e.target.checked }))} />
          {"Counts"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max depth (0 = all)"}
          <input type="number" min={0} max={50} value={options.maxDepth} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxDepth: Math.min(50, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Root"}
          <input type="text" value={options.rootName} placeholder={"auto"} onChange={(e) => setOptions((o) => ({ ...o, rootName: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Paths or outline"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"src/index.ts\nsrc/lib/util.ts\nREADME.md"}
                  aria-label={"Paths or outline"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Tree"} value={result.output} error={result.error?.message ?? null} placeholder={"Tree will appear here"} />}
        />
      </div>
    </div>
  );
}
