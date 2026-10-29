"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateLicense } from "./transform";
import type { LicenseGeneratorOptions } from "./schema";

type Options = LicenseGeneratorOptions;

const defaultOptions: Options = {"license":"mit","output":"file","comment":"block"} as Options;

export function LicenseGeneratorToolView() {
  const [input, setInput] = useState("holder: Your Name\nyear: 2026");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateLicense(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          License
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.license}
            onChange={(e) => setOptions((o) => ({ ...o, license: e.target.value as Options["license"] }))}
          >
            <option value="mit">{"MIT"}</option>
            <option value="isc">{"ISC"}</option>
            <option value="bsd-2">{"BSD 2-Clause"}</option>
            <option value="bsd-3">{"BSD 3-Clause"}</option>
            <option value="unlicense">{"Unlicense"}</option>
            <option value="apache-2">{"Apache 2.0 (notice)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="file">{"LICENSE file"}</option>
            <option value="header">{"Source header"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Header comment
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.comment}
            onChange={(e) => setOptions((o) => ({ ...o, comment: e.target.value as Options["comment"] }))}
          >
            <option value="block">{"/* block */"}</option>
            <option value="line">{"// line"}</option>
            <option value="hash">{"# hash"}</option>
            <option value="none">{"none"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Copyright holder (and optional year)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="holder: Jane Doe\nyear: 2026"
                aria-label="Copyright holder (and optional year)"
                className=""
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
