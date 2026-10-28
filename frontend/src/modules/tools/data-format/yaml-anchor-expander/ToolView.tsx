"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { expandYaml } from "./transform";
import type { YamlAnchorExpanderOptions } from "./schema";

type Options = YamlAnchorExpanderOptions;

const defaultOptions: Options = {"output":"yaml","sortKeys":false} as Options;

export function YamlAnchorExpanderToolView() {
  const [input, setInput] = useState("defaults: &defaults\n  image: node:20\n  retries: 2\ntest:\n  <<: *defaults\n  script: npm test\nlint:\n  <<: *defaults\n  retries: 0\n  script: npm run lint");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => expandYaml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="yaml">{"YAML"}</option>
            <option value="json">{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sortKeys} onChange={(e) => setOptions((o) => ({ ...o, sortKeys: e.target.checked }))} />
          Sort keys
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">YAML with anchors</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"base: &base\n  a: 1\nchild:\n  <<: *base"}
                aria-label="YAML with anchors"
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
