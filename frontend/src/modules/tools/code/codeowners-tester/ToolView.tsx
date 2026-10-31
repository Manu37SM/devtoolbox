"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { codeownersTester } from "./transform";
import type { CodeownersTesterOptions } from "./schema";

type Options = CodeownersTesterOptions;

const defaultOptions: Options = {"flavor": "github", "view": "path", "lint": true, "ruleUsage": false, "caseInsensitive": false, "format": "table"} as Options;

export function CodeownersTesterToolView() {
  const [in0, setIn0] = useState("# Global fallback\n*                @org/maintainers\n*.js             @org/frontend\n/docs/           @org/docs\n/src/api/        @org/backend @alice\n/src/api/legacy  @bob\n\n---\nREADME.md\nsrc/api/user.ts\nsrc/api/legacy/old.ts\ndocs/guide/intro.md\nweb/app.js");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => codeownersTester(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Flavor"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.flavor} onChange={(e) => setOptions((o) => ({ ...o, flavor: e.target.value as Options["flavor"] }))}>
            <option value={"github"}>{"GitHub"}</option>
            <option value={"gitlab"}>{"GitLab (sections)"}</option>
          </select>
        </label>
        {["table"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Group by"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.view} onChange={(e) => setOptions((o) => ({ ...o, view: e.target.value as Options["view"] }))}>
            <option value={"path"}>{"Path"}</option>
            <option value={"owner"}>{"Owner"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"table"}>{"Table"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lint} onChange={(e) => setOptions((o) => ({ ...o, lint: e.target.checked }))} />
          {"Lint"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ruleUsage} onChange={(e) => setOptions((o) => ({ ...o, ruleUsage: e.target.checked }))} />
          {"Rule usage"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.caseInsensitive} onChange={(e) => setOptions((o) => ({ ...o, caseInsensitive: e.target.checked }))} />
          {"Case-insensitive paths"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"CODEOWNERS --- paths"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Rules, then a line with only ---, then one file path per line"}
                  aria-label={"CODEOWNERS --- paths"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Owners"} fileName={"owners.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Owners per path appear here"} />}
        />
      </div>
    </div>
  );
}
