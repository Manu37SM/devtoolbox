"use client";

import { useEffect, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { beautifyCss } from "./transform";
import type { CssBeautifierOptions } from "./schema";

export function CssBeautifierToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CssBeautifierOptions>({
    mode: "beautify",
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    singleQuote: false,
    restructure: true,
    keepLicenseComments: true,
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    beautifyCss(input, options).then((result) => {
      if (cancelled) return;
      setOutput(result.output);
      setError(result.error?.message ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
      <div className="flex overflow-hidden rounded-sm border border-border-default w-fit">
        <Button
          variant={options.mode === "beautify" ? "primary" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => setOptions((o) => ({ ...o, mode: "beautify" }))}
        >
          Beautify
        </Button>
        <Button
          variant={options.mode === "minify" ? "primary" : "ghost"}
          size="sm"
          className="rounded-none"
          onClick={() => setOptions((o) => ({ ...o, mode: "minify" }))}
        >
          Minify
        </Button>
      </div>
        {options.mode === "beautify" ? (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.tabWidth)}
            onChange={(e) => setOptions((o) => ({ ...o, tabWidth: (Number(e.target.value) as 2 | 4) }))}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.useTabs}
            onChange={(e) => setOptions((o) => ({ ...o, useTabs: e.target.checked }))}
          />
          Tabs
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Line width
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.printWidth)}
            onChange={(e) => setOptions((o) => ({ ...o, printWidth: (Number(e.target.value) as 80 | 100 | 120) }))}
          >
            <option value="80">80</option>
            <option value="100">100</option>
            <option value="120">120</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.singleQuote}
            onChange={(e) => setOptions((o) => ({ ...o, singleQuote: e.target.checked }))}
          />
          Single quotes
        </label>
          </>
        ) : (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.restructure}
            onChange={(e) => setOptions((o) => ({ ...o, restructure: e.target.checked }))}
          />
          Merge rules
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.keepLicenseComments}
            onChange={(e) => setOptions((o) => ({ ...o, keepLicenseComments: e.target.checked }))}
          />
          Keep /*! comments
        </label>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput as="code" value={input} onChange={(e) => setInput(e.target.value)} language="css" aria-label="CSS input" />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "beautify" ? "minify" : o.mode === "minify" ? "beautify" : o.mode }))} value={output} error={error} />}
        />
      </div>
    </div>
  );
}
