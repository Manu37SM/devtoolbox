"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { resolveSourceMap } from "./transform";
import type { SourceMapResolverOptions } from "./schema";

type Options = SourceMapResolverOptions;

const defaultOptions: Options = {"columnBase": "1", "bias": "before", "context": 2, "mode": "lookup", "stripPrefix": ""} as Options;

export function SourceMapResolverToolView() {
  const [in0, setIn0] = useState("{\n  \"version\": 3,\n  \"sources\": [\"src.ts\"],\n  \"sourcesContent\": [\"export function greet(name: string): string {\\n  const message = \\\"Hello, \\\" + name;\\n  return message.toUpperCase();\\n}\\n\\nexport function fail(reason: string) {\\n  throw new Error(\\\"failed: \\\" + reason);\\n}\\n\"],\n  \"mappings\": \"AAAO,SAASA,EAAMC,EAAsB,CAE1C,OADgB,UAAYA,GACb,YAAY,CAC7B,CAEO,SAASC,EAAKC,EAAgB,CACnC,MAAM,IAAI,MAAM,WAAaA,CAAM,CACrC\",\n  \"names\": [\"greet\", \"name\", \"fail\", \"reason\"]\n}");
  const [in1, setIn1] = useState("Error: failed: x\n    at n (https://cdn.example.com/out.js:1:63)\n    at t (https://cdn.example.com/out.js:1:10)");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => resolveSourceMap(in0, in1, options), [in0, in1, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"lookup"}>{"Resolve positions"}</option>
            <option value={"sources"}>{"List sources"}</option>
            <option value={"mappings"}>{"Dump mappings"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Columns start at"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.columnBase} onChange={(e) => setOptions((o) => ({ ...o, columnBase: e.target.value as Options["columnBase"] }))}>
            <option value={"1"}>{"1 (browsers)"}</option>
            <option value={"0"}>{"0"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Between mappings"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.bias} onChange={(e) => setOptions((o) => ({ ...o, bias: e.target.value as Options["bias"] }))}>
            <option value={"before"}>{"Use previous"}</option>
            <option value={"after"}>{"Use next"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Context lines"}
          <input type="number" min={0} max={10} value={options.context} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, context: Math.min(10, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Strip prefix"}
          <input type="text" value={options.stripPrefix} placeholder={"webpack://app/"} onChange={(e) => setOptions((o) => ({ ...o, stripPrefix: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Source map (.map JSON)"}</label>
                <ToolInput
                  as="code"
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  language="json"
                  placeholder={"{\"version\":3,\"sources\":[...],\"mappings\":\"...\"}"}
                  aria-label={"Source map (.map JSON)"}
                  className="font-mono"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Positions or stack trace"}</label>
                <ToolInput
                  value={in1}
                  onChange={(e) => setIn1(e.target.value)}
                  placeholder={"at fn (bundle.min.js:1:63)\n1:10"}
                  aria-label={"Positions or stack trace"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Original positions"} value={result.output} error={result.error?.message ?? null} placeholder={"Original positions will appear here"} />}
        />
      </div>
    </div>
  );
}
