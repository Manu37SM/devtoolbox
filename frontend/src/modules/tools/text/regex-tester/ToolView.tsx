"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { testRegex } from "./transform";
import type { RegexFlags } from "./schema";

export function RegexTesterToolView() {
  const [pattern, setPattern] = useState("");
  const [input, setInput] = useState("");
  const [flags, setFlags] = useState<RegexFlags>({
    global: true,
    ignoreCase: false,
    multiline: false,
    dotAll: false,
    unicode: false,
  });

  const result = useMemo(() => testRegex(pattern, flags, input), [pattern, flags, input]);

  const highlighted = useMemo(() => {
    if (result.matches.length === 0) return input;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    result.matches.forEach((m, i) => {
      if (m.index > lastIndex) parts.push(input.slice(lastIndex, m.index));
      parts.push(
        <mark key={i} className="rounded-sm bg-accent/30 text-text-primary">
          {m.match || "​"}
        </mark>,
      );
      lastIndex = m.index + m.match.length;
    });
    if (lastIndex < input.length) parts.push(input.slice(lastIndex));
    return parts;
  }, [input, result.matches]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-text-muted">/</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
          aria-label="Regex pattern"
          placeholder="\\d+"
        />
        <span className="font-mono text-text-muted">/</span>
        <div className="flex gap-1">
          {(["global", "ignoreCase", "multiline", "dotAll", "unicode"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFlags((prev) => ({ ...prev, [f]: !prev[f] }))}
              className={`rounded-sm border px-2 py-1 font-mono text-xs ${
                flags[f] ? "border-accent bg-accent text-accent-foreground" : "border-border-default text-text-secondary"
              }`}
              title={f}
            >
              {{ global: "g", ignoreCase: "i", multiline: "m", dotAll: "s", unicode: "u" }[f]}
            </button>
          ))}
        </div>
      </div>
      {result.error && (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      )}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Test string</label>
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Test string" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">
            Matches ({result.matches.length})
          </label>
          <div className="flex-1 overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm whitespace-pre-wrap">
            {highlighted}
          </div>
        </div>
      </div>
    </div>
  );
}
