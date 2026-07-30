"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { transformUrlEncode } from "./transform";
import type { UrlEncodeOptions } from "./schema";

export function UrlEncodeToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<UrlEncodeOptions>({ mode: "encode", component: true });

  const result = useMemo(() => transformUrlEncode(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "encode" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "encode" }))}
          >
            Encode
          </Button>
          <Button
            variant={options.mode === "decode" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "decode" }))}
          >
            Decode
          </Button>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.component}
            onChange={(e) => setOptions((o) => ({ ...o, component: e.target.checked }))}
          />
          Component mode (encode reserved chars)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="URL input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} />}
        />
      </div>
    </div>
  );
}
