"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { generateJsonSchema } from "./transform";
import type { JsonSchemaGeneratorOptions } from "./schema";

export function JsonSchemaGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonSchemaGeneratorOptions>({ allRequired: true });

  const result = useMemo(() => generateJsonSchema(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.allRequired}
            onChange={(e) => setOptions((o) => ({ ...o, allRequired: e.target.checked }))}
          />
          Mark all fields required
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Sample JSON</label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language="json"
                placeholder='{"id":1,"name":"example"}'
                aria-label="Sample JSON input"
              />
            </div>
          }
          output={
            <OutputPane
              label="JSON Schema"
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Inferred JSON Schema will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
