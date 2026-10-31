"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { contentDispositionBuilder } from "./transform";
import type { ContentDispositionBuilderOptions } from "./schema";

type Options = ContentDispositionBuilderOptions;

const defaultOptions: Options = {"mode": "build", "disposition": "attachment", "fieldName": "file", "style": "both", "fallback": "transliterate", "stripPath": true, "windowsSafe": false, "alwaysExtended": false, "headerName": false, "snippet": "header"} as Options;

export function ContentDispositionBuilderToolView() {
  const [in0, setIn0] = useState("r\u00e9sum\u00e9 \u2013 2024.pdf\nreport (final).xlsx");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => contentDispositionBuilder(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"build"}>{"Build"}</option>
            <option value={"parse"}>{"Parse"}</option>
          </select>
        </label>
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Type"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.disposition} onChange={(e) => setOptions((o) => ({ ...o, disposition: e.target.value as Options["disposition"] }))}>
            <option value={"attachment"}>{"attachment"}</option>
            <option value={"inline"}>{"inline"}</option>
            <option value={"form-data"}>{"form-data"}</option>
          </select>
        </label>
        )}
        {["form-data"].includes(String(options.disposition)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Field name"}
          <input type="text" value={options.fieldName} placeholder={"file"} onChange={(e) => setOptions((o) => ({ ...o, fieldName: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Style"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.style} onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}>
            <option value={"both"}>{"filename + filename*"}</option>
            <option value={"ascii"}>{"filename only"}</option>
            <option value={"extended"}>{"filename* only"}</option>
          </select>
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ASCII fallback"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.fallback} onChange={(e) => setOptions((o) => ({ ...o, fallback: e.target.value as Options["fallback"] }))}>
            <option value={"transliterate"}>{"Transliterate (\u00e9\u2192e)"}</option>
            <option value={"underscore"}>{"Underscore"}</option>
          </select>
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripPath} onChange={(e) => setOptions((o) => ({ ...o, stripPath: e.target.checked }))} />
          {"Strip directories"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.windowsSafe} onChange={(e) => setOptions((o) => ({ ...o, windowsSafe: e.target.checked }))} />
          {"Windows-safe"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.alwaysExtended} onChange={(e) => setOptions((o) => ({ ...o, alwaysExtended: e.target.checked }))} />
          {"Always add filename*"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.headerName} onChange={(e) => setOptions((o) => ({ ...o, headerName: e.target.checked }))} />
          {"Include header name"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.snippet} onChange={(e) => setOptions((o) => ({ ...o, snippet: e.target.value as Options["snippet"] }))}>
            <option value={"header"}>{"Header"}</option>
            <option value={"spring"}>{"Spring"}</option>
            <option value={"servlet"}>{"Servlet"}</option>
            <option value={"express"}>{"Express"}</option>
            <option value={"flask"}>{"Flask"}</option>
            <option value={"aspnet"}>{"ASP.NET"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Filename(s), one per line  /  header to parse"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"r\u00e9sum\u00e9 \u2013 2024.pdf"}
                  aria-label={"Filename(s), one per line  /  header to parse"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Content-Disposition"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a filename to build a header"} />}
        />
      </div>
    </div>
  );
}
