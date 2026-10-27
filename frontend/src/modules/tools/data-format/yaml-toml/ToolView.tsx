"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertYamlToml } from "./transform";
import type { YamlTomlOptions } from "./schema";

type Options = YamlTomlOptions;

const defaultOptions: Options = {"mode":"yaml-to-toml","indent":"2"} as Options;

export function YamlTomlToolView() {
  const [input, setInput] = useState("title: Example\nowner:\n  name: Ann\nports: [8000, 8001]");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertYamlToml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["yaml-to-toml","YAML → TOML"],["toml-to-yaml","TOML → YAML"]] as const).map(([value, label]) => (
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
        {options.mode === "toml-to-yaml" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          YAML indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indent}
            onChange={(e) => setOptions((o) => ({ ...o, indent: e.target.value as Options["indent"] }))}
          >
            <option value="2">{"2 spaces"}</option>
            <option value="4">{"4 spaces"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
