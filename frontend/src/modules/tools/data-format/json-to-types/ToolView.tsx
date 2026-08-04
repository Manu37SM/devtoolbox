"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { generateTypes } from "./transform";
import type { JsonToTypesOptions } from "./schema";

const languages: { value: JsonToTypesOptions["language"]; label: string }[] = [
  { value: "typescript", label: "TypeScript" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
];

export function JsonToTypesToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonToTypesOptions>({
    language: "typescript",
    rootName: "Root",
  });

  const result = useMemo(() => generateTypes(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {languages.map((lang) => (
            <Button
              key={lang.value}
              variant={options.language === lang.value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, language: lang.value }))}
            >
              {lang.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Root name
          <input
            type="text"
            value={options.rootName}
            onChange={(e) => setOptions((o) => ({ ...o, rootName: e.target.value }))}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm font-mono"
            aria-label="Root type name"
          />
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
              label="Generated Types"
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Generated type definitions will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
