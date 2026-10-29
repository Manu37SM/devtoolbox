"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertJsonToJava } from "./transform";
import type { JsonToJavaOptions } from "./schema";

type Options = JsonToJavaOptions;

const defaultOptions: Options = {"style":"lombok","rootName":"Root","packageName":"","jackson":true} as Options;

export function JsonToJavaToolView() {
  const [input, setInput] = useState("{\n  \"id\": 1,\n  \"user_name\": \"ann\",\n  \"tags\": [\"a\"],\n  \"address\": { \"zip\": \"400001\" }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertJsonToJava(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["lombok","Lombok @Data"],["pojo","POJO"],["record","Record"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.style === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, style: value as Options["style"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Root class
          <input
            type="text"
            value={options.rootName}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, rootName: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Package
          <input
            type="text"
            value={options.packageName}
            placeholder="com.example.dto"
            onChange={(e) => setOptions((o) => ({ ...o, packageName: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.jackson} onChange={(e) => setOptions((o) => ({ ...o, jackson: e.target.checked }))} />
          Jackson @JsonProperty
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste a JSON sample"
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Java" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
