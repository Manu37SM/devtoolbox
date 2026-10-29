"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateBadges } from "./transform";
import type { BadgeGeneratorOptions } from "./schema";

type Options = BadgeGeneratorOptions;

const defaultOptions: Options = {"kind":"github","format":"markdown","style":"flat"} as Options;

export function BadgeGeneratorToolView() {
  const [input, setInput] = useState("repo: acme/widgets\nworkflow: ci.yml");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateBadges(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Kind
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.kind}
            onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}
          >
            <option value="static">{"Custom static badge"}</option>
            <option value="github">{"GitHub repo set"}</option>
            <option value="npm">{"npm package"}</option>
            <option value="pypi">{"PyPI package"}</option>
            <option value="maven-central">{"Maven Central"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="markdown">{"Markdown"}</option>
            <option value="html">{"HTML"}</option>
            <option value="rst">{"reStructuredText"}</option>
            <option value="url">{"URLs only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.style}
            onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}
          >
            <option value="flat">{"flat"}</option>
            <option value="flat-square">{"flat-square"}</option>
            <option value="plastic">{"plastic"}</option>
            <option value="for-the-badge">{"for-the-badge"}</option>
            <option value="social">{"social"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (repo, workflow, package, group, artifact, or label, message, color, logo, link)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="repo: owner/name"
                aria-label="Fields (repo, workflow, package, group, artifact, or label, message, color, logo, link)"
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
