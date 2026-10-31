"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { dataUriTool } from "./transform";
import type { DataUriOptions } from "./schema";

type Options = DataUriOptions;

const defaultOptions: Options = {"mode": "build", "mime": "text/plain", "encoding": "auto", "charset": "utf-8", "includeCharset": true, "minify": false, "wrap": "none", "urlSafe": false} as Options;

export function DataUriToolToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => dataUriTool(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"build"}>{"Build data URI"}</option>
            <option value={"parse"}>{"Parse data URI"}</option>
          </select>
        </label>
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"MIME type"}
          <input type="text" value={options.mime} placeholder={"image/svg+xml"} onChange={(e) => setOptions((o) => ({ ...o, mime: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Encoding"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.encoding} onChange={(e) => setOptions((o) => ({ ...o, encoding: e.target.value as Options["encoding"] }))}>
            <option value={"auto"}>{"Shortest"}</option>
            <option value={"base64"}>{"Base64"}</option>
            <option value={"percent"}>{"Percent-encoded"}</option>
          </select>
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Charset"}
          <input type="text" value={options.charset} placeholder={"utf-8"} onChange={(e) => setOptions((o) => ({ ...o, charset: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeCharset} onChange={(e) => setOptions((o) => ({ ...o, includeCharset: e.target.checked }))} />
          {"Add charset"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.minify} onChange={(e) => setOptions((o) => ({ ...o, minify: e.target.checked }))} />
          {"Minify whitespace"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.urlSafe} onChange={(e) => setOptions((o) => ({ ...o, urlSafe: e.target.checked }))} />
          {"URL-safe base64"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Wrap as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.wrap} onChange={(e) => setOptions((o) => ({ ...o, wrap: e.target.value as Options["wrap"] }))}>
            <option value={"none"}>{"Plain URI"}</option>
            <option value={"css-url"}>{"CSS url()"}</option>
            <option value={"html-img"}>{"HTML <img>"}</option>
            <option value={"html-link"}>{"HTML download link"}</option>
            <option value={"markdown-img"}>{"Markdown image"}</option>
            <option value={"js-string"}>{"JS string"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Text or data URI"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"<svg xmlns=\"http://www.w3.org/2000/svg\" ...>"}
                  aria-label={"Text or data URI"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Output"} value={result.output} error={result.error?.message ?? null} placeholder={"Result will appear here"} />}
        />
      </div>
    </div>
  );
}
