"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertJsonYaml } from "./transform";
import type { JsonYamlOptions } from "./schema";

export function JsonYamlToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonYamlOptions>({ mode: "json-to-yaml", indent: 2 });

  const result = useMemo(() => convertJsonYaml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "json-to-yaml" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "json-to-yaml" }))}
          >
            JSON → YAML
          </Button>
          <Button
            variant={options.mode === "yaml-to-json" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "yaml-to-json" }))}
          >
            YAML → JSON
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">
                {options.mode === "json-to-yaml" ? "JSON" : "YAML"}
              </label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language={options.mode === "json-to-yaml" ? "json" : "yaml"}
                aria-label="Input"
              />
            </div>
          }
          output={
            <OutputPane
              label={options.mode === "json-to-yaml" ? "YAML" : "JSON"}
              value={result.output}
              error={result.error?.message ?? null}
            />
          }
        />
      </div>
    </div>
  );
}
