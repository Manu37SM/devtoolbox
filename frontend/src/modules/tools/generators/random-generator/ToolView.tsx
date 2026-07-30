"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { generateRandom } from "./transform";
import type { RandomGeneratorOptions } from "./schema";

export function RandomGeneratorToolView() {
  const [kind, setKind] = useState<"number" | "string">("number");
  const [numberOpts, setNumberOpts] = useState({ min: 1, max: 100, count: 10, allowDuplicates: true });
  const [stringOpts, setStringOpts] = useState({
    length: 16,
    count: 10,
    charset: "alphanumeric" as const,
  });
  const [seed, setSeed] = useState(0);

  const options: RandomGeneratorOptions =
    kind === "number" ? { kind: "number", ...numberOpts } : { kind: "string", ...stringOpts };

  const result = useMemo(() => generateRandom(options), [options, seed]);
  const joined = result.values.join("\n");

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["number", "string"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                kind === k ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {kind === "number" ? (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Min
              <input
                type="number"
                value={numberOpts.min}
                onChange={(e) => setNumberOpts((o) => ({ ...o, min: Number(e.target.value) }))}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Max
              <input
                type="number"
                value={numberOpts.max}
                onChange={(e) => setNumberOpts((o) => ({ ...o, max: Number(e.target.value) }))}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={numberOpts.allowDuplicates}
                onChange={(e) => setNumberOpts((o) => ({ ...o, allowDuplicates: e.target.checked }))}
              />
              Allow duplicates
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Count
              <input
                type="number"
                min={1}
                max={1000}
                value={numberOpts.count}
                onChange={(e) => setNumberOpts((o) => ({ ...o, count: Number(e.target.value) }))}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              />
            </label>
          </>
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Length
              <input
                type="number"
                min={1}
                max={256}
                value={stringOpts.length}
                onChange={(e) => setStringOpts((o) => ({ ...o, length: Number(e.target.value) }))}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Charset
              <select
                value={stringOpts.charset}
                onChange={(e) =>
                  setStringOpts((o) => ({
                    ...o,
                    charset: e.target.value as "alphanumeric" | "alpha" | "numeric" | "hex",
                  }))
                }
                className="rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              >
                <option value="alphanumeric">Alphanumeric</option>
                <option value="alpha">Alphabetic</option>
                <option value="numeric">Numeric</option>
                <option value="hex">Hex</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Count
              <input
                type="number"
                min={1}
                max={1000}
                value={stringOpts.count}
                onChange={(e) => setStringOpts((o) => ({ ...o, count: Number(e.target.value) }))}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
              />
            </label>
          </>
        )}
        <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
          Regenerate
        </Button>
      </div>

      {result.error ? (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">
              Generated ({result.values.length})
            </label>
            <CopyButton value={joined} />
          </div>
          <pre className="flex-1 overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
            {joined}
          </pre>
        </div>
      )}
    </div>
  );
}
