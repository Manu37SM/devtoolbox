"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertCase } from "./transform";
import type { CaseTarget } from "./schema";

const TARGETS: { value: CaseTarget; label: string }[] = [
  { value: "camel", label: "camelCase" },
  { value: "pascal", label: "PascalCase" },
  { value: "snake", label: "snake_case" },
  { value: "kebab", label: "kebab-case" },
  { value: "constant", label: "CONSTANT_CASE" },
  { value: "title", label: "Title Case" },
  { value: "sentence", label: "Sentence case" },
  { value: "upper", label: "UPPER CASE" },
  { value: "lower", label: "lower case" },
];

export function CaseConverterToolView() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<CaseTarget>("camel");

  const output = useMemo(() => convertCase(input, { target }), [input, target]);

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
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text input" />
            </div>
          }
          output={<OutputPane value={output} />}
        />
      </div>
    </div>
  );
}
