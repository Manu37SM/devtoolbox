"use client";

import { useEffect, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { beautifyJsTs } from "./transform";
import type { JsTsBeautifierOptions } from "./schema";

export function JsTsBeautifierToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsTsBeautifierOptions>({
    mode: "beautify",
    language: "javascript",
    semi: true,
    singleQuote: false,
    tabWidth: 2,
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    beautifyJsTs(input, options).then((result) => {
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
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
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["javascript", "typescript"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setOptions((o) => ({ ...o, language: lang }))}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                options.language === lang ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        {options.mode === "beautify" && (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.semi}
                onChange={(e) => setOptions((o) => ({ ...o, semi: e.target.checked }))}
              />
              Semicolons
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
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language={options.language === "typescript" ? "typescript" : "javascript"}
                aria-label="Code input"
              />
            </div>
          }
          output={<OutputPane value={output} error={error} />}
        />
      </div>
    </div>
  );
}
