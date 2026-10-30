"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { parseConflicts, resolveMergeConflicts } from "./transform";
import type { MergeChoice, MergeConflictResolverOptions } from "./schema";

type Options = MergeConflictResolverOptions;

const SAMPLE = `function retries() {
<<<<<<< HEAD
  return 3;
||||||| merged common ancestors
  return 1;
=======
  return 5;
>>>>>>> feature/backoff
}
`;

const defaultOptions: Options = { defaultChoice: "keep", overrides: "", autoIdentical: true, ignoreWhitespace: false, output: "resolved" };
const CHOICES: [MergeChoice, string][] = [
  ["keep", "Keep markers"],
  ["ours", "Ours (HEAD)"],
  ["theirs", "Theirs (incoming)"],
  ["both", "Both: ours, then theirs"],
  ["both-reverse", "Both: theirs, then ours"],
  ["base", "Base (diff3)"],
];
const field = "rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";

export function MergeConflictResolverToolView() {
  const [input, setInput] = useState(SAMPLE);
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [picked, setPicked] = useState<Record<number, MergeChoice | "">>({});

  const conflicts = useMemo(() => parseConflicts(input).conflicts, [input]);
  const overrides = Object.entries(picked)
    .filter(([n, c]) => c && Number(n) <= conflicts.length)
    .map(([n, c]) => `${n}=${c}`)
    .join(", ");
  const result = useMemo(() => resolveMergeConflicts(input, { ...options, overrides }), [input, options, overrides]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Resolve all as
          <select className={field} value={options.defaultChoice} onChange={(e) => setOptions((o) => ({ ...o, defaultChoice: e.target.value as MergeChoice }))}>
            {CHOICES.map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select className={field} value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value="resolved">Resolved file</option>
            <option value="report">Conflict report</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.autoIdentical} onChange={(e) => setOptions((o) => ({ ...o, autoIdentical: e.target.checked }))} />
          Collapse identical sides
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreWhitespace} onChange={(e) => setOptions((o) => ({ ...o, ignoreWhitespace: e.target.checked }))} />
          Ignore whitespace
        </label>
      </div>
      {conflicts.length > 0 && (
        <div className="flex max-h-28 flex-wrap items-center gap-2 overflow-auto">
          {conflicts.map((c) => (
            <label key={c.index} className="flex items-center gap-1.5 text-sm text-text-secondary">
              {`#${c.index} (line ${c.startLine})`}
              <select
                className={field}
                value={picked[c.index] ?? ""}
                onChange={(e) => setPicked((p) => ({ ...p, [c.index]: e.target.value as MergeChoice | "" }))}
              >
                <option value="">Use default</option>
                {CHOICES.map(([v, t]) => (
                  <option key={v} value={v}>{t}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">File with conflict markers</label>
              <ToolInput value={input} onChange={(e) => setInput(e.target.value)} placeholder="<<<<<<< HEAD ..." aria-label="File with conflict markers" className="font-mono" />
            </div>
          }
          output={<OutputPane label="Result" value={result.output} error={result.error?.message ?? null} placeholder="Resolved file will appear here" />}
        />
      </div>
    </div>
  );
}
