"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertCurl } from "./transform";
import type { CurlTarget } from "./schema";

const targets: { value: CurlTarget; label: string }[] = [
  { value: "fetch", label: "fetch" },
  { value: "axios", label: "axios" },
  { value: "python", label: "Python requests" },
];

export function CurlToCodeToolView() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CurlTarget>("fetch");

  const result = useMemo(() => convertCurl(input, { target }), [input, target]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {targets.map((t) => (
            <Button
              key={t.value}
              variant={target === t.value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setTarget(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-text-muted">Parsed locally — your command, headers and credentials never leave this tab.</span>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">cURL command</label>
              <Textarea
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
