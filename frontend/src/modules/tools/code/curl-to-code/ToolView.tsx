"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertCurl } from "./transform";
import { CURL_TARGETS, type CurlTarget } from "./schema";


export function CurlToCodeToolView() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CurlTarget>("fetch");

  const [javaTextBlocks, setJavaTextBlocks] = useState(true);
  const result = useMemo(() => convertCurl(input, { target, javaTextBlocks }), [input, target, javaTextBlocks]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Language
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={target}
            onChange={(e) => setTarget(e.target.value as CurlTarget)}
          >
            {CURL_TARGETS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {target.startsWith("java") || target.startsWith("spring") || target === "okhttp" ? (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input type="checkbox" checked={javaTextBlocks} onChange={(e) => setJavaTextBlocks(e.target.checked)} />
            Text blocks (Java 15+)
          </label>
        ) : null}
        <span className="text-xs text-text-muted">Parsed locally — your command, headers and credentials never leave this tab.</span>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">cURL command</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`curl -X POST https://api.example.com/items \\\n  -H 'Content-Type: application/json' \\\n  -d '{"name":"widget"}'`}
                aria-label="cURL command input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Code" value={result.output} error={result.error?.message ?? null} placeholder="Generated code will appear here" />}
        />
      </div>
    </div>
  );
}
