"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { formatYaml } from "./transform";
import type { YamlFormatterOptions } from "./schema";

export function YamlFormatterToolView() {
  const [input, setInput] = useState("");
  const [options] = useState<YamlFormatterOptions>({ indent: 2 });

  const result = useMemo(() => formatYaml(input, options), [input, options]);

  return (
    <div className="min-h-0 flex-1">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Input</label>
            <CodeEditor value={input} onChange={(e) => setInput(e.target.value)} language="yaml" aria-label="YAML input" />
          </div>
        }
        output={
          <OutputPane
            value={result.output}
            error={
              result.error
                ? `${result.error.message}${result.error.line ? ` (line ${result.error.line}, column ${result.error.column})` : ""}`
                : null
            }
          />
        }
      />
    </div>
  );
}
