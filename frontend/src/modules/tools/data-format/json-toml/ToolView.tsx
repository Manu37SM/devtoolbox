"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertJsonToml } from "./transform";
import type { JsonTomlOptions } from "./schema";

export function JsonTomlToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonTomlOptions>({ mode: "json-to-toml", indent: 2 });

  const result = useMemo(() => convertJsonToml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "json-to-toml" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "json-to-toml" }))}
          >
            JSON → TOML
          </Button>
          <Button
            variant={options.mode === "toml-to-json" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "toml-to-json" }))}
          >
            TOML → JSON
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">
                {options.mode === "json-to-toml" ? "JSON" : "TOML"}
              </label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language={options.mode === "json-to-toml" ? "json" : "plain"}
                aria-label="Input"
              />
            </div>
          }
          output={
            <OutputPane
              label={options.mode === "json-to-toml" ? "TOML" : "JSON"}
              value={result.output}
              error={result.error?.message ?? null}
            />
          }
        />
      </div>
    </div>
  );
}
