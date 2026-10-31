"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { uriTemplateExpander } from "./transform";
import type { UriTemplateExpanderOptions } from "./schema";

type Options = UriTemplateExpanderOptions;

const defaultOptions: Options = {"action": "expand", "variables": "{\"id\": 42, \"tags\": [\"a\",\"b\"], \"q\": \"hello world\", \"page\": 2}", "explain": false, "showTemplate": false} as Options;

export function UriTemplateExpanderToolView() {
  const [in0, setIn0] = useState("https://api.example.com/items/{id}{?page,q}\n/search{?tags*}\n{+base}/docs{#section}\nhttps://{host}{/path*}{?q:3,page}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => uriTemplateExpander(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"expand"}>{"Expand"}</option>
            <option value={"variables"}>{"List variables"}</option>
            <option value={"check"}>{"Validate"}</option>
          </select>
        </label>
        {["expand"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Variables (JSON)"}
          <input type="text" value={options.variables} placeholder={"{\"id\": 42}"} onChange={(e) => setOptions((o) => ({ ...o, variables: e.target.value }))} className="w-80 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["expand"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.explain} onChange={(e) => setOptions((o) => ({ ...o, explain: e.target.checked }))} />
          {"Explain each variable"}
        </label>
        )}
        {["expand"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showTemplate} onChange={(e) => setOptions((o) => ({ ...o, showTemplate: e.target.checked }))} />
          {"Show template \u2192 result"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Templates (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"https://api.example.com/items/{id}{?page,q}"}
                  aria-label={"Templates (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Expanded"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter an RFC 6570 URI template"} />}
        />
      </div>
    </div>
  );
}
