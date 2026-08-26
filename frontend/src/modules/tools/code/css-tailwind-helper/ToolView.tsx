"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { convertCssTailwind } from "./transform";
import type { CssTailwindDirection } from "./schema";

const CSS_PLACEHOLDER = "margin: 16px;\ncolor: #ef4444;\ndisplay: flex;\nborder-radius: 8px;";
const TAILWIND_PLACEHOLDER = "m-4 text-red-500 flex rounded-lg";

export function CssTailwindHelperToolView() {
  const [direction, setDirection] = useState<CssTailwindDirection>("css-to-tailwind");
  const [input, setInput] = useState(CSS_PLACEHOLDER);

  const result = useMemo(() => convertCssTailwind(input, direction), [input, direction]);

  const swap = () => {
    setDirection((d) => (d === "css-to-tailwind" ? "tailwind-to-css" : "css-to-tailwind"));
    setInput(direction === "css-to-tailwind" ? TAILWIND_PLACEHOLDER : CSS_PLACEHOLDER);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Direction
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as CssTailwindDirection)}
            className="w-56 rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="css-to-tailwind">CSS → Tailwind classes</option>
            <option value="tailwind-to-css">Tailwind classes → CSS</option>
          </select>
        </label>
        <button
          type="button"
          onClick={swap}
          className="rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-secondary"
        >
          Swap + load example
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <label className="flex h-full flex-col gap-1 text-sm text-text-secondary">
          {direction === "css-to-tailwind" ? "CSS declarations" : "Tailwind classes"}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="h-full min-h-[160px] flex-1 resize-none rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm"
            aria-label={direction === "css-to-tailwind" ? "CSS declarations input" : "Tailwind classes input"}
          />
        </label>
        <div className="h-full min-h-[160px]">
          <OutputPane
            value={result.output}
            error={result.error?.message ?? null}
            label={direction === "css-to-tailwind" ? "Suggested Tailwind classes" : "Equivalent CSS"}
            placeholder="Result will appear here"
          />
        </div>
      </div>
    </div>
  );
}
