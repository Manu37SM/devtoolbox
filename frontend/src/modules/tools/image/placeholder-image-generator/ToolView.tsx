"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generatePlaceholderImage, placeholderImageToDataUri } from "./transform";
import type { PlaceholderImageOptions } from "./schema";

const defaultOptions: PlaceholderImageOptions = {
  width: 600,
  height: 400,
  backgroundColor: "#94a3b8",
  textColor: "#ffffff",
  text: "",
};

export function PlaceholderImageGeneratorToolView() {
  const [options, setOptions] = useState<PlaceholderImageOptions>(defaultOptions);
  const patch = (p: Partial<PlaceholderImageOptions>) => setOptions((o) => ({ ...o, ...p }));

  const result = useMemo(() => generatePlaceholderImage(options), [options]);
  const dataUri = result.error === null ? placeholderImageToDataUri(result.output) : "";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Width
          <input
            type="number"
            min={1}
            max={4000}
            value={options.width}
            onChange={(e) => patch({ width: Number(e.target.value) })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
            aria-label="Width in pixels"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Height
          <input
            type="number"
            min={1}
            max={4000}
            value={options.height}
            onChange={(e) => patch({ height: Number(e.target.value) })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
            aria-label="Height in pixels"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Background
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(options.backgroundColor) ? options.backgroundColor : "#94a3b8"}
            onChange={(e) => patch({ backgroundColor: e.target.value })}
            className="h-9 cursor-pointer rounded-sm border border-border-default bg-bg-raised p-0.5"
            aria-label="Background color"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Text color
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(options.textColor) ? options.textColor : "#ffffff"}
            onChange={(e) => patch({ textColor: e.target.value })}
            className="h-9 cursor-pointer rounded-sm border border-border-default bg-bg-raised p-0.5"
            aria-label="Label text color"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Label text (optional — defaults to WIDTH×HEIGHT)
        <input
          value={options.text ?? ""}
          onChange={(e) => patch({ text: e.target.value })}
          placeholder="e.g. Hero image"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm"
          aria-label="Label text"
        />
      </label>

      {result.error === null && (
        <div className="flex items-center justify-center overflow-auto rounded-md border border-border-default bg-bg-subtle p-3">
          {}
          <img src={dataUri} alt="Placeholder preview" className="max-h-64 max-w-full" />
        </div>
      )}

      <div className="min-h-[140px]">
        <OutputPane
          value={result.output}
          error={result.error?.message ?? null}
          label="Generated SVG"
          placeholder="Generated SVG markup will appear here"
        />
      </div>
    </div>
  );
}
