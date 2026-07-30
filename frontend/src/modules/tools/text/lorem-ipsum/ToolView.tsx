"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateLoremIpsum } from "./transform";
import type { LoremIpsumOptions } from "./schema";

const UNITS: LoremIpsumOptions["unit"][] = ["words", "sentences", "paragraphs", "list-items"];

export function LoremIpsumToolView() {
  const [options, setOptions] = useState<LoremIpsumOptions>({
    unit: "paragraphs",
    count: 3,
    startWithLoremIpsum: true,
  });
  const [seed, setSeed] = useState(1);

  const output = useMemo(() => generateLoremIpsum(options, seed), [options, seed]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {UNITS.map((u) => (
            <button
              key={u}
              onClick={() => setOptions((o) => ({ ...o, unit: u }))}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                options.unit === u ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
            >
              {u.replace("-", " ")}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1}
            max={200}
            value={options.count}
            onChange={(e) => setOptions((o) => ({ ...o, count: Number(e.target.value) }))}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.startWithLoremIpsum}
            onChange={(e) => setOptions((o) => ({ ...o, startWithLoremIpsum: e.target.checked }))}
          />
          Start with "Lorem ipsum"
        </label>
        <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="Generated text" value={output} />
      </div>
    </div>
  );
}
