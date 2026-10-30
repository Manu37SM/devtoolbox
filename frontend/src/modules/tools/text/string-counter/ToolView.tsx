"use client";

import { useMemo, useState } from "react";
import { analyzeText, type StringStats } from "./transform";
import { stringCounterOptionsSchema, type StringCounterOptions } from "./schema";
import { ToolInput } from "@/components/tools/ToolInput";
import { ResultActions, toLines } from "@/components/tools/ResultActions";

type NumericKey = {
  [K in keyof StringStats]-?: StringStats[K] extends number | undefined ? K : never;
}[keyof StringStats];

const STAT_LABELS: { key: NumericKey; label: string }[] = [
  { key: "characters", label: "Characters" },
  { key: "charactersNoSpaces", label: "Characters (no spaces)" },
  { key: "words", label: "Words" },
  { key: "uniqueWords", label: "Unique words" },
  { key: "lines", label: "Lines" },
  { key: "longestLine", label: "Longest line" },
  { key: "sentences", label: "Sentences" },
  { key: "paragraphs", label: "Paragraphs" },
  { key: "graphemes", label: "Graphemes (visible)" },
  { key: "utf16Units", label: "UTF-16 units (String.length)" },
  { key: "bytesUtf8", label: "Bytes (UTF-8)" },
  { key: "bytesUtf16", label: "Bytes (UTF-16)" },
];

const CLS_LABEL = "flex items-center gap-1.5 text-sm text-text-secondary";
const CLS_SELECT = "rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";

function minutes(m: number | undefined): string {
  if (!m) return "0 min";
  if (m < 1) return `${Math.max(1, Math.round(m * 60))} s`;
  return `${Math.round(m)} min`;
}

export function StringCounterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<StringCounterOptions>(() => stringCounterOptionsSchema.parse({}));
  const stats = useMemo(() => analyzeText(input, options), [input, options]);
  const set = <K extends keyof StringCounterOptions>(k: K, v: StringCounterOptions[K]) =>
    setOptions((o) => ({ ...o, [k]: v }));

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className={CLS_LABEL}>
          Count characters as
          <select
            className={CLS_SELECT}
            value={options.charMode}
            onChange={(e) => set("charMode", e.target.value as StringCounterOptions["charMode"])}
          >
            <option value="codepoints">Code points</option>
            <option value="graphemes">Visible characters (graphemes)</option>
            <option value="utf16">UTF-16 units (JS/Java length)</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          Words
          <select
            className={CLS_SELECT}
            value={options.wordMode}
            onChange={(e) => set("wordMode", e.target.value as StringCounterOptions["wordMode"])}
          >
            <option value="whitespace">Split on spaces</option>
            <option value="locale">Language-aware (CJK, Thai)</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          Reading speed
          <input
            type="number"
            min={50}
            max={1000}
            value={options.wpm}
            onChange={(e) => set("wpm", Math.min(1000, Math.max(50, Number(e.target.value) || 200)))}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
          wpm
        </label>
        <label className={CLS_LABEL}>
          Limit
          <select
            className={CLS_SELECT}
            value={options.limit}
            onChange={(e) => set("limit", e.target.value as StringCounterOptions["limit"])}
          >
            <option value="none">None</option>
            <option value="tweet">Post on X (280)</option>
            <option value="sms">SMS (160)</option>
            <option value="metaTitle">SEO title (60)</option>
            <option value="metaDescription">Meta description (160)</option>
            <option value="custom">Custom…</option>
          </select>
        </label>
        {options.limit === "custom" && (
          <label className={CLS_LABEL}>
            Max
            <input
              type="number"
              min={1}
              value={options.customLimit}
              onChange={(e) => set("customLimit", Math.max(1, Number(e.target.value) || 1))}
              className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            />
          </label>
        )}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-h-[240px] flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Input</label>
          <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text input" />
          {stats.limit && (
            <p
              role="status"
              className={`text-sm ${stats.limit.remaining < 0 ? "text-danger" : "text-text-secondary"}`}
            >
              {stats.limit.name}: {stats.limit.used} / {stats.limit.max} —{" "}
              {stats.limit.remaining < 0 ? `${-stats.limit.remaining} over` : `${stats.limit.remaining} left`}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 overflow-auto">
          {STAT_LABELS.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2"
            >
              <span className="text-sm text-text-secondary">{label}</span>
              <span className="font-mono text-sm text-text-primary">{stats[key] ?? 0}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
            <span className="text-sm text-text-secondary">Reading / speaking time</span>
            <span className="font-mono text-sm text-text-primary">
              {minutes(stats.readingTimeMinutes)} / {minutes(stats.speakingTimeMinutes)}
            </span>
          </div>
          {stats.sms && (
            <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
              <span className="text-sm text-text-secondary">SMS ({stats.sms.encoding})</span>
              <span className="font-mono text-sm text-text-primary">
                {stats.sms.segments} × {stats.sms.perSegment}
              </span>
            </div>
          )}
          <ResultActions text={toLines(STAT_LABELS.map(({ key, label }) => [label, stats[key] ?? 0]))} json={stats} />
        </div>
      </div>
    </div>
  );
}
