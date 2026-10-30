"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertCase } from "./transform";
import type { CaseConverterOptions, CaseTarget } from "./schema";

const TARGETS: { value: CaseTarget; label: string }[] = [
  { value: "camel", label: "camelCase" },
  { value: "pascal", label: "PascalCase" },
  { value: "snake", label: "snake_case" },
  { value: "kebab", label: "kebab-case" },
  { value: "constant", label: "CONSTANT_CASE" },
  { value: "dot", label: "dot.case" },
  { value: "path", label: "path/case" },
  { value: "train", label: "Train-Case" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
  { value: "upper", label: "UPPER CASE" },
  { value: "lower", label: "lower case" },
];

export function CaseConverterToolView() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CaseTarget>("camel");
  const [options, setOptions] = useState<Omit<CaseConverterOptions, "target">>({
    perLine: false,
    preserveAcronyms: false,
    splitDigits: false,
    smartTitle: false,
  });

  const output = useMemo(() => convertCase(input, { target, ...options }), [input, target, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {TARGETS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTarget(t.value)}
            className={`rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors duration-fast ${
              target === t.value
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border-default text-text-secondary hover:bg-bg-raised"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.perLine}
            onChange={(e) => setOptions((o) => ({ ...o, perLine: e.target.checked }))}
          />
          Each line separately
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.preserveAcronyms}
            onChange={(e) => setOptions((o) => ({ ...o, preserveAcronyms: e.target.checked }))}
          />
          Keep acronyms (ID, URL)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.splitDigits}
            onChange={(e) => setOptions((o) => ({ ...o, splitDigits: e.target.checked }))}
          />
          Digits as separate words
        </label>
        {target === "title" && (
  <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.smartTitle}
              onChange={(e) => setOptions((o) => ({ ...o, smartTitle: e.target.checked }))}
            />
            Smart title (a, of, the…)
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text input" />
            </div>
          }
          output={<OutputPane value={output} />}
        />
      </div>
    </div>
  );
}
