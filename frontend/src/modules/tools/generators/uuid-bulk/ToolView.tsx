"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { generateUuidBulk } from "./transform";
import type { UuidBulkOptions } from "./schema";

export function UuidBulkToolView() {
  const [options, setOptions] = useState<UuidBulkOptions>({ version: "v4", count: 100, format: "newline" });
  const [seed, setSeed] = useState(0);

  const output = useMemo(() => generateUuidBulk(options), [options, seed]);

  function handleDownload() {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids.${options.format === "json-array" ? "json" : options.format === "csv" ? "csv" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["v4", "v7"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setOptions((o) => ({ ...o, version: v }))}
              className={`px-3 py-1.5 text-xs font-medium ${
                options.version === v ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
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
            max={10000}
            value={options.count}
            onChange={(e) =>
              setOptions((o) => ({ ...o, count: Math.max(1, Math.min(10000, Number(e.target.value))) }))
            }
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            value={options.format}
            onChange={(e) =>
              setOptions((o) => ({ ...o, format: e.target.value as "newline" | "json-array" | "csv" }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          >
            <option value="newline">Newline-separated</option>
            <option value="json-array">JSON array</option>
            <option value="csv">CSV</option>
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
          Regenerate
        </Button>
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          Download
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Generated ({options.count})
          </label>
          <CopyButton value={output} />
        </div>
        <pre className="flex-1 overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
          {output}
        </pre>
      </div>
    </div>
  );
}
