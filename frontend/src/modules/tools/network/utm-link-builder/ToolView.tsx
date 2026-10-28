"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { buildUtmLinks } from "./transform";
import type { UtmLinkBuilderOptions } from "./schema";

type Options = UtmLinkBuilderOptions;

const defaultOptions: Options = {"spaces":"underscore","lowercase":true,"overwrite":true} as Options;

export function UtmLinkBuilderToolView() {
  const [input, setInput] = useState("https://example.com/pricing\nhttps://example.com/blog/launch\nsource: Newsletter\nmedium: email\ncampaign: Spring Sale\ncontent: header link");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildUtmLinks(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Spaces become
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.spaces}
            onChange={(e) => setOptions((o) => ({ ...o, spaces: e.target.value as Options["spaces"] }))}
          >
            <option value="underscore">{"_ underscore"}</option>
            <option value="hyphen">{"- hyphen"}</option>
            <option value="encode">{"%20 encode"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lowercase} onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))} />
          Lower-case values
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.overwrite} onChange={(e) => setOptions((o) => ({ ...o, overwrite: e.target.checked }))} />
          Overwrite existing utm_*
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">URLs and parameters</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://example.com/pricing\nsource: newsletter\nmedium: email\ncampaign: spring sale"
                aria-label="URLs and parameters"
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
