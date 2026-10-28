"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateWorkflow } from "./transform";
import type { GithubActionsGeneratorOptions } from "./schema";

type Options = GithubActionsGeneratorOptions;

const defaultOptions: Options = {"stack":"node","triggers":"push-pr","branch":"main","runner":"ubuntu-latest","cache":true,"matrix":false} as Options;

export function GithubActionsGeneratorToolView() {
  const [input, setInput] = useState("npm run e2e");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateWorkflow(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Stack
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.stack}
            onChange={(e) => setOptions((o) => ({ ...o, stack: e.target.value as Options["stack"] }))}
          >
            <option value="node">{"Node.js"}</option>
            <option value="python">{"Python"}</option>
            <option value="java-maven">{"Java (Maven)"}</option>
            <option value="java-gradle">{"Java (Gradle)"}</option>
            <option value="go">{"Go"}</option>
            <option value="rust">{"Rust"}</option>
            <option value="docker">{"Docker build"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Trigger
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.triggers}
            onChange={(e) => setOptions((o) => ({ ...o, triggers: e.target.value as Options["triggers"] }))}
          >
            <option value="push-pr">{"Push + PR"}</option>
            <option value="push">{"Push"}</option>
            <option value="pr">{"Pull request"}</option>
            <option value="schedule">{"Weekly schedule"}</option>
            <option value="manual">{"Manual"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Branch
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.branch}
            onChange={(e) => setOptions((o) => ({ ...o, branch: e.target.value as Options["branch"] }))}
          >
            <option value="main">{"main"}</option>
            <option value="master">{"master"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Runner
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.runner}
            onChange={(e) => setOptions((o) => ({ ...o, runner: e.target.value as Options["runner"] }))}
          >
            <option value="ubuntu-latest">{"Ubuntu"}</option>
            <option value="windows-latest">{"Windows"}</option>
            <option value="macos-latest">{"macOS"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.cache} onChange={(e) => setOptions((o) => ({ ...o, cache: e.target.checked }))} />
          Cache dependencies
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.matrix} onChange={(e) => setOptions((o) => ({ ...o, matrix: e.target.checked }))} />
          Version matrix
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Extra commands to run (optional, one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="npm run e2e"
                aria-label="Extra commands to run (optional, one per line)"
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
