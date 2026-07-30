"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { generateUuids } from "./transform";
import type { UuidGeneratorOptions } from "./schema";

export function UuidGeneratorToolView() {
  const [options, setOptions] = useState<UuidGeneratorOptions>({
    version: "v4",
    count: 5,
    uppercase: false,
    hyphens: true,
  });
  const [seed, setSeed] = useState(0);

  const uuids = useMemo(() => generateUuids(options), [options, seed]);
  const joined = uuids.join("\n");

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["v4", "v7"] as const).map((v) => (
            <button
              key={v}
              className={`px-3 py-1.5 text-xs font-medium ${
                options.version === v ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
              onClick={() => setOptions((o) => ({ ...o, version: v }))}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1}
            max={1000}
            value={options.count}
            onChange={(e) =>
              setOptions((o) => ({ ...o, count: Math.max(1, Math.min(1000, Number(e.target.value))) }))
            }
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.hyphens}
            onChange={(e) => setOptions((o) => ({ ...o, hyphens: e.target.checked }))}
          />
          Hyphens
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.uppercase}
            onChange={(e) => setOptions((o) => ({ ...o, uppercase: e.target.checked }))}
          />
          Uppercase
        </label>
        <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Generated ({uuids.length})
          </label>
          <CopyButton value={joined} />
        </div>
        <pre className="flex-1 overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
          {joined}
        </pre>
      </div>
    </div>
  );
}
