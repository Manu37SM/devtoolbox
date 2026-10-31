"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { makefileGenerator } from "./transform";
import type { MakefileGeneratorOptions } from "./schema";

type Options = MakefileGeneratorOptions;

const defaultOptions: Options = {"preset": "node", "shell": "bash-strict", "help": true, "phony": "auto", "silent": false, "deleteOnError": true, "noBuiltinRules": true, "escapeDollar": true, "defaultGoal": ""} as Options;

export function MakefileGeneratorToolView() {
  const [in0, setIn0] = useState("deploy: build # Deploy to staging\n    ./scripts/deploy.sh staging");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => makefileGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Preset"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.preset} onChange={(e) => setOptions((o) => ({ ...o, preset: e.target.value as Options["preset"] }))}>
            <option value={"none"}>{"None"}</option>
            <option value={"node"}>{"Node.js"}</option>
            <option value={"python"}>{"Python venv"}</option>
            <option value={"go"}>{"Go"}</option>
            <option value={"maven"}>{"Maven / Spring"}</option>
            <option value={"docker"}>{"Docker"}</option>
            <option value={"c"}>{"C"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Shell"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.shell} onChange={(e) => setOptions((o) => ({ ...o, shell: e.target.value as Options["shell"] }))}>
            <option value={"bash-strict"}>{"bash -eu -o pipefail"}</option>
            <option value={"sh"}>{"/bin/sh"}</option>
            <option value={"default"}>{"make default"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {".PHONY"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.phony} onChange={(e) => setOptions((o) => ({ ...o, phony: e.target.value as Options["phony"] }))}>
            <option value={"auto"}>{"Non-file targets"}</option>
            <option value={"all"}>{"All targets"}</option>
            <option value={"none"}>{"None"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Default goal"}
          <input type="text" value={options.defaultGoal} placeholder={"help"} onChange={(e) => setOptions((o) => ({ ...o, defaultGoal: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.help} onChange={(e) => setOptions((o) => ({ ...o, help: e.target.checked }))} />
          {"make help"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.silent} onChange={(e) => setOptions((o) => ({ ...o, silent: e.target.checked }))} />
          {"Silence recipes (@)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.deleteOnError} onChange={(e) => setOptions((o) => ({ ...o, deleteOnError: e.target.checked }))} />
          {".DELETE_ON_ERROR"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noBuiltinRules} onChange={(e) => setOptions((o) => ({ ...o, noBuiltinRules: e.target.checked }))} />
          {"No built-in rules"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.escapeDollar} onChange={(e) => setOptions((o) => ({ ...o, escapeDollar: e.target.checked }))} />
          {"$VAR \u2192 $$VAR"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Your targets (merged over the preset). Recipes are the indented lines."}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"deploy: build # Deploy to staging\n    ./scripts/deploy.sh staging\nREGION = eu-west-1"}
                  aria-label={"Your targets (merged over the preset). Recipes are the indented lines."}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Makefile"} fileName={"Makefile"} value={result.output} error={result.error?.message ?? null} placeholder={"Pick a preset or add targets"} />}
        />
      </div>
    </div>
  );
}
