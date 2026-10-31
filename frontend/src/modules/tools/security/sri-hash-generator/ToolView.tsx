"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { sriHashGenerator } from "./transform";
import type { SriHashGeneratorOptions } from "./schema";

type Options = SriHashGeneratorOptions;

const defaultOptions: Options = {"action": "generate", "algorithms": ["sha384"], "inputKind": "text", "lineEndings": "keep", "format": "integrity", "url": "https://cdn.example.com/lib.min.js", "crossorigin": "anonymous", "expected": "", "trailingNewline": false} as Options;

export function SriHashGeneratorToolView() {
  const [in0, setIn0] = useState("console.log('hello');\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => sriHashGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"generate"}>{"Generate"}</option>
            <option value={"verify"}>{"Verify"}</option>
          </select>
        </label>
        <fieldset className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <legend className="sr-only">{"Algorithms"}</legend>
          <span>{"Algorithms"}</span>
          {([["sha256", "SHA-256"], ["sha384", "SHA-384"], ["sha512", "SHA-512"]] as const).map(([v, x]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="checkbox" checked={(options.algorithms as string[]).includes(v)} onChange={(e) => setOptions((o) => ({ ...o, algorithms: (e.target.checked ? [...(o.algorithms as string[]), v] : (o.algorithms as string[]).filter((i) => i !== v)) as Options["algorithms"] }))} />
              {x}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Input is"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.inputKind} onChange={(e) => setOptions((o) => ({ ...o, inputKind: e.target.value as Options["inputKind"] }))}>
            <option value={"text"}>{"Text (UTF-8)"}</option>
            <option value={"hex"}>{"Hex bytes"}</option>
            <option value={"base64"}>{"Base64 bytes"}</option>
          </select>
        </label>
        {["text"].includes(String(options.inputKind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line endings"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.lineEndings} onChange={(e) => setOptions((o) => ({ ...o, lineEndings: e.target.value as Options["lineEndings"] }))}>
            <option value={"keep"}>{"Keep"}</option>
            <option value={"lf"}>{"LF"}</option>
            <option value={"crlf"}>{"CRLF"}</option>
          </select>
        </label>
        )}
        {["generate"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"integrity"}>{"integrity value"}</option>
            <option value={"script"}>{"<script> tag"}</option>
            <option value={"link"}>{"<link> tag"}</option>
            <option value={"csp"}>{"CSP hash source"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        )}
        {["script", "link"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"URL"}
          <input type="text" value={options.url} placeholder={"https://cdn.example.com/lib.min.js"} onChange={(e) => setOptions((o) => ({ ...o, url: e.target.value }))} className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["script", "link"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"crossorigin"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.crossorigin} onChange={(e) => setOptions((o) => ({ ...o, crossorigin: e.target.value as Options["crossorigin"] }))}>
            <option value={"anonymous"}>{"anonymous"}</option>
            <option value={"use-credentials"}>{"use-credentials"}</option>
            <option value={"none"}>{"omit"}</option>
          </select>
        </label>
        )}
        {["verify"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Expected integrity"}
          <input type="text" value={options.expected} placeholder={"sha384-..."} onChange={(e) => setOptions((o) => ({ ...o, expected: e.target.value }))} className="w-72 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["generate"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trailingNewline} onChange={(e) => setOptions((o) => ({ ...o, trailingNewline: e.target.checked }))} />
          {"Trailing newline"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"File contents"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Paste the exact contents of the script or stylesheet"}
                  aria-label={"File contents"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Integrity"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste the file contents to hash"} />}
        />
      </div>
    </div>
  );
}
