"use client";

import { useMemo, useState } from "react";
import { analyzeText } from "./transform";
import { ToolInput } from "@/components/tools/ToolInput";
import { ResultActions, toLines } from "@/components/tools/ResultActions";

const STAT_LABELS: { key: keyof ReturnType<typeof analyzeText>; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "charactersNoSpaces", label: "Characters (no spaces)" },
  { key: "words", label: "Words" },
  { key: "lines", label: "Lines" },
  { key: "sentences", label: "Sentences" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "bytesUtf8", label: "Bytes (UTF-8)" },
];

export function StringCounterToolView() {
  const [input, setInput] = useState("");
  const stats = useMemo(() => analyzeText(input), [input]);

  return (
    <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
      <div className="flex min-h-[240px] flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Input</label>
        <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text input" />
      </div>
      <div className="flex flex-col gap-2">
        {STAT_LABELS.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2"
          >
            <span className="text-sm text-text-secondary">{label}</span>
            <span className="font-mono text-sm text-text-primary">{stats[key]}</span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
          <span className="text-sm text-text-secondary">Reading time</span>
          <span className="font-mono text-sm text-text-primary">
            {stats.readingTimeMinutes < 1
              ? "<1 min"
              : `${Math.round(stats.readingTimeMinutes)} min`}
          </span>
        </div>
        <ResultActions text={toLines(STAT_LABELS.map(({ key, label }) => [label, stats[key]]))} json={stats} />
      </div>
    </div>
  );
}
