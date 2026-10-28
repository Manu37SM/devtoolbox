"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runPackageJsonValidator } from "./transform";
import type { PackageJsonValidatorOptions } from "./schema";

type Options = PackageJsonValidatorOptions;

const defaultOptions: Options = {"minSeverity":"info","forPublishing":false} as Options;

export function PackageJsonValidatorToolView() {
  const [input, setInput] = useState("{\n  \"name\": \"My Package\",\n  \"version\": \"1.0\",\n  \"main\": \"index.js\",\n  \"dependencies\": { \"left-pad\": \"latest\", \"lodash\": \"^4.17.21\" },\n  \"scripts\": { \"test\": \"jest\" }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runPackageJsonValidator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Show
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.minSeverity}
            onChange={(e) => setOptions((o) => ({ ...o, minSeverity: e.target.value as Options["minSeverity"] }))}
          >
            <option value="info">{"Info and above"}</option>
            <option value="warning">{"Warnings and errors"}</option>
            <option value="error">{"Errors only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.forPublishing} onChange={(e) => setOptions((o) => ({ ...o, forPublishing: e.target.checked }))} />
          Check publishing readiness
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">package.json</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"name\": \"my-pkg\"}"}
                aria-label="package.json"
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
