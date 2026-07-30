"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { diffText, diffTokenStats } from "./transform";
import type { TextDiffOptions } from "./schema";
import { Badge } from "@/components/ui/badge";

export function TextDiffToolView() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [options, setOptions] = useState<TextDiffOptions>({
    mode: "line",
    ignoreWhitespace: false,
    ignoreCase: false,
  });

  const ops = useMemo(() => diffText(before, after, options), [before, after, options]);
  const stats = useMemo(() => diffTokenStats(before, after, options), [before, after, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["line", "word", "char"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setOptions((o) => ({ ...o, mode: m }))}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                options.mode === m ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreWhitespace}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreWhitespace: e.target.checked }))}
          />
          Ignore whitespace
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreCase}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))}
          />
          Ignore case
        </label>
        <Badge variant="success">+{stats.additions}</Badge>
        <Badge variant="danger">-{stats.removals}</Badge>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-[160px] flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Before</label>
          <Textarea value={before} onChange={(e) => setBefore(e.target.value)} aria-label="Before text" />
        </div>
        <div className="flex min-h-[160px] flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">After</label>
          <Textarea value={after} onChange={(e) => setAfter(e.target.value)} aria-label="After text" />
        </div>
      </div>

      <div className="flex min-h-[120px] flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Diff</label>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
          {ops.map((op, i) => (
            <span
              key={i}
              className={
                op.type === "add"
                  ? "bg-success/15 text-success"
                  : op.type === "remove"
                    ? "bg-danger/15 text-danger line-through"
                    : "text-text-primary"
              }
            >
              {op.value}
            </span>
          ))}
        </pre>
      </div>
    </div>
  );
}
