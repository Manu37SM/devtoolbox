"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { generateJsonSchema } from "./transform";
import type { JsonSchemaGeneratorOptions } from "./schema";

export function JsonSchemaGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonSchemaGeneratorOptions>({ allRequired: true, draft: "draft-07", detectFormats: false, forbidAdditional: false, includeExamples: false });

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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Draft
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.draft}
            onChange={(e) => setOptions((o) => ({ ...o, draft: e.target.value as JsonSchemaGeneratorOptions["draft"] }))}
          >
            <option value="draft-07">Draft 07</option>
            <option value="2019-09">2019-09</option>
            <option value="2020-12">2020-12</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.detectFormats}
            onChange={(e) => setOptions((o) => ({ ...o, detectFormats: e.target.checked }))}
          />
          Detect formats
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.forbidAdditional}
            onChange={(e) => setOptions((o) => ({ ...o, forbidAdditional: e.target.checked }))}
          />
          No extra properties
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.includeExamples}
            onChange={(e) => setOptions((o) => ({ ...o, includeExamples: e.target.checked }))}
          />
          Include examples
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Sample JSON</label>
              <ToolInput
                as="code"
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
