"use client";

import { useEffect, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { beautifyHtml } from "./transform";
import type { HtmlBeautifierOptions } from "./schema";

export function HtmlBeautifierToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<HtmlBeautifierOptions>({ mode: "beautify", tabWidth: 2 });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    beautifyHtml(input, options).then((result) => {
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
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput as="code" value={input} onChange={(e) => setInput(e.target.value)} language="html" aria-label="HTML input" />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "beautify" ? "minify" : o.mode === "minify" ? "beautify" : o.mode }))} value={output} error={error} />}
        />
      </div>
    </div>
  );
}
