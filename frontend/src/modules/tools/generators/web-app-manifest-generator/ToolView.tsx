"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateManifest } from "./transform";
import type { WebAppManifestGeneratorOptions } from "./schema";

type Options = WebAppManifestGeneratorOptions;

const defaultOptions: Options = {"display":"standalone","orientation":"any","maskableIcons":true,"includeHtml":true} as Options;

export function WebAppManifestGeneratorToolView() {
  const [input, setInput] = useState("name: DevToolbox\nshort_name: Toolbox\ndescription: Developer utilities that run in your browser\nstart_url: /\ntheme_color: #0f172a\nbackground_color: #ffffff\nicon_path: /icons");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateManifest(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Display
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.display}
            onChange={(e) => setOptions((o) => ({ ...o, display: e.target.value as Options["display"] }))}
          >
            <option value="standalone">{"standalone"}</option>
            <option value="minimal-ui">{"minimal-ui"}</option>
            <option value="fullscreen">{"fullscreen"}</option>
            <option value="browser">{"browser"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Orientation
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.orientation}
            onChange={(e) => setOptions((o) => ({ ...o, orientation: e.target.value as Options["orientation"] }))}
          >
            <option value="any">{"any"}</option>
            <option value="portrait">{"portrait"}</option>
            <option value="landscape">{"landscape"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.maskableIcons} onChange={(e) => setOptions((o) => ({ ...o, maskableIcons: e.target.checked }))} />
          Maskable icon
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeHtml} onChange={(e) => setOptions((o) => ({ ...o, includeHtml: e.target.checked }))} />
          Include HTML tags
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: name, short_name, start_url, theme_color, background_color, description, lang, icon_path</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="name: My App"
                aria-label="Fields: name, short_name, start_url, theme_color, background_color, description, lang, icon_path"
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
