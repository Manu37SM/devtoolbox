"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { OutputPane } from "@/components/tools/OutputPane";
import { generatePalette } from "./transform";
import type { ColorPaletteGeneratorOptions } from "./schema";

const SCHEMES: { value: ColorPaletteGeneratorOptions["scheme"]; label: string }[] = [
  { value: "monochromatic", label: "Monochromatic" },
  { value: "shades", label: "Shades" },
  { value: "complementary", label: "Complementary" },
  { value: "analogous", label: "Analogous" },
  { value: "triadic", label: "Triadic" },
  { value: "tetradic", label: "Tetradic" },
];

export function ColorPaletteGeneratorToolView() {
  const [baseColor, setBaseColor] = useState("#4f46e5");
  const [options, setOptions] = useState<ColorPaletteGeneratorOptions>({ scheme: "monochromatic", count: 5 });

  const result = useMemo(() => generatePalette(baseColor, options), [baseColor, options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="palette-color-picker" className="text-sm font-medium text-text-secondary">
            Base color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="palette-color-picker"
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(baseColor) ? baseColor : "#4f46e5"}
              onChange={(e) => setBaseColor(e.target.value)}
              className="h-9 w-9 cursor-pointer rounded-sm border border-border-default bg-bg-raised p-0.5"
              aria-label="Base color picker"
            />
            <input
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              className="w-32 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
              aria-label="Base color hex"
              placeholder="#4f46e5"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="palette-scheme" className="text-sm font-medium text-text-secondary">
            Scheme
          </label>
          <select
            id="palette-scheme"
            value={options.scheme}
            onChange={(e) => setOptions((o) => ({ ...o, scheme: e.target.value as ColorPaletteGeneratorOptions["scheme"] }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {SCHEMES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="palette-count" className="text-sm font-medium text-text-secondary">
            Count
          </label>
          <input
            id="palette-count"
            type="number"
            min={2}
            max={10}
            value={options.count}
            onChange={(e) => setOptions((o) => ({ ...o, count: Number(e.target.value) }))}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {result.error ? (
        <p role="alert" className="text-sm text-danger">
          {result.error.message}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {result.colors.map((c) => (
            <div key={c.hex} className="flex flex-col items-center gap-1.5">
              <div
                className="h-20 w-20 rounded-md border border-border-default"
                style={{ backgroundColor: c.hex }}
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-text-primary">{c.hex}</span>
              <CopyButton value={c.hex} />
            </div>
          ))}
        </div>
      )}

      <div className="min-h-[100px]">
        <OutputPane value={result.output} error={null} label="Hex list" placeholder="Palette hex codes will appear here" />
      </div>
    </div>
  );
}
