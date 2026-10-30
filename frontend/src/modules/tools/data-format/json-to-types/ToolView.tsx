"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
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
    tsDeclaration: "interface",
    exportTypes: false,
    readonlyFields: false,
    goPackage: "main",
    goOmitEmpty: false,
    pythonStyle: "dataclass",
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
        {options.language === "typescript" && (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Declare as
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.tsDeclaration}
            onChange={(e) => setOptions((o) => ({ ...o, tsDeclaration: e.target.value as JsonToTypesOptions["tsDeclaration"] }))}
          >
            <option value="interface">interface</option>
            <option value="type">type</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.exportTypes}
            onChange={(e) => setOptions((o) => ({ ...o, exportTypes: e.target.checked }))}
          />
          export
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.readonlyFields}
            onChange={(e) => setOptions((o) => ({ ...o, readonlyFields: e.target.checked }))}
          />
          readonly
        </label>
          </>
        )}
        {options.language === "go" && (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Package
          <input
            type="text"
            value={options.goPackage}
            placeholder="main"
            onChange={(e) => setOptions((o) => ({ ...o, goPackage: e.target.value }))}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.goOmitEmpty}
            onChange={(e) => setOptions((o) => ({ ...o, goOmitEmpty: e.target.checked }))}
          />
          omitempty on all
        </label>
          </>
        )}
        {options.language === "python" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.pythonStyle}
            onChange={(e) => setOptions((o) => ({ ...o, pythonStyle: e.target.value as JsonToTypesOptions["pythonStyle"] }))}
          >
            <option value="dataclass">dataclass</option>
            <option value="typeddict">TypedDict</option>
            <option value="pydantic">Pydantic</option>
          </select>
        </label>
        )}
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
