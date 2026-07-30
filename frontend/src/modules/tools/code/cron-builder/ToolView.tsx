"use client";

import { useMemo, useState } from "react";
import { parseCron } from "./transform";

export function CronBuilderToolView() {
  const [input, setInput] = useState("*/15 9-17 * * 1-5");
  const result = useMemo(() => parseCron(input, 5), [input]);

  return (
    <div className="flex h-full flex-col gap-4">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full max-w-md rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
        aria-label="Cron expression"
        placeholder="*/15 9-17 * * 1-5"
      />
      {result.error ? (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      ) : result.description ? (
        <>
          <p className="text-sm text-text-primary">{result.description}</p>
          <div>
            <h2 className="mb-1 text-sm font-medium text-text-secondary">
              Next {result.nextRuns.length} runs (UTC)
            </h2>
            <ul className="flex flex-col gap-1 font-mono text-sm">
              {result.nextRuns.map((run) => (
                <li key={run} className="rounded-sm border border-border-subtle bg-bg-raised px-2 py-1">
                  {run}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <p className="text-sm text-text-muted">Enter a 5-field cron expression above.</p>
      )}
    </div>
  );
}
