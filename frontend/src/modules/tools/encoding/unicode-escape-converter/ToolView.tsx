"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertUnicodeEscape } from "./transform";
import type { UnicodeEscapeFormat, UnicodeEscapeOptions } from "./schema";

const FORMATS: { value: UnicodeEscapeFormat; label: string }[] = [
  { value: "js", label: "\\uXXXX (JS / JSON / Java)" },
  { value: "es6", label: "\\u{X} (ES6)" },
  { value: "codepoint", label: "U+XXXX" },
  { value: "html-hex", label: "&#xX; (HTML hex)" },
  { value: "html-dec", label: "&#N; (HTML decimal)" },
];

export function UnicodeEscapeConverterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<UnicodeEscapeOptions>({ mode: "escape", format: "js", escapeAscii: false });

  const result = useMemo(() => convertUnicodeEscape(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["escape", "unescape"] as const).map((mode) => (
            <Button
              key={mode}
              variant={options.mode === mode ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode }))}
            >
              {mode === "escape" ? "Text → Escapes" : "Escapes → Text"}
            </Button>
          ))}
        </div>
        {options.mode === "escape" ? (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Format
              <select
                className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
                value={options.format}
                onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as UnicodeEscapeFormat }))}
              >
                {FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.escapeAscii}
                onChange={(e) => setOptions((o) => ({ ...o, escapeAscii: e.target.checked }))}
              />
              Escape ASCII too
            </label>
          </>
        ) : (
          <span className="text-xs text-text-muted">All notations are detected automatically.</span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "escape" ? "Text to escape" : "\\u0048\\u0069 or U+1F600 or &#x1F600;"}
                aria-label="Unicode escape input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
