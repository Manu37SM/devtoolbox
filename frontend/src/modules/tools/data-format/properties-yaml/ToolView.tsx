"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertPropertiesYaml } from "./transform";
import type { PropertiesYamlOptions } from "./schema";

type Options = PropertiesYamlOptions;

const defaultOptions: Options = {"mode":"properties-to-yaml","inferTypes":true,"escapeUnicode":false} as Options;

export function PropertiesYamlToolView() {
  const [input, setInput] = useState("server.port=8080\nspring.datasource.url=jdbc:oracle:thin:@//db:1521/svc\nspring.profiles.active[0]=dev\nspring.profiles.active[1]=oracle");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertPropertiesYaml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["properties-to-yaml","Properties → YAML"],["yaml-to-properties","YAML → Properties"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inferTypes} onChange={(e) => setOptions((o) => ({ ...o, inferTypes: e.target.checked }))} />
          Infer numbers / booleans
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.escapeUnicode} onChange={(e) => setOptions((o) => ({ ...o, escapeUnicode: e.target.checked }))} />
          Escape non-ASCII (\uXXXX)
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
                placeholder=""
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "properties-to-yaml" ? "yaml-to-properties" : o.mode === "yaml-to-properties" ? "properties-to-yaml" : o.mode }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
