"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateBoxShadowBorderRadiusCss, hexToRgba } from "./transform";
import type { BoxShadowBorderRadiusOptions } from "./schema";

const defaultOptions: BoxShadowBorderRadiusOptions = {
  offsetX: 0,
  offsetY: 4,
  blur: 12,
  spread: 0,
  color: "#000000",
  opacity: 20,
  inset: false,
  borderRadius: 12,
};

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-text-secondary">
      {label} ({value}px)
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export function BoxShadowBorderRadiusGeneratorToolView() {
  const [options, setOptions] = useState<BoxShadowBorderRadiusOptions>(defaultOptions);

  const result = useMemo(() => generateBoxShadowBorderRadiusCss(options), [options]);

  const patch = (p: Partial<BoxShadowBorderRadiusOptions>) => setOptions((o) => ({ ...o, ...p }));

  const previewShadow =
    result.error === null
      ? `${options.inset ? "inset " : ""}${options.offsetX}px ${options.offsetY}px ${options.blur}px ${options.spread}px ${hexToRgba(options.color, options.opacity)}`
      : "none";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Slider label="Offset X" value={options.offsetX} min={-100} max={100} onChange={(v) => patch({ offsetX: v })} />
        <Slider label="Offset Y" value={options.offsetY} min={-100} max={100} onChange={(v) => patch({ offsetY: v })} />
        <Slider label="Blur" value={options.blur} min={0} max={200} onChange={(v) => patch({ blur: v })} />
        <Slider label="Spread" value={options.spread} min={-100} max={100} onChange={(v) => patch({ spread: v })} />
        <Slider
          label="Border radius"
          value={options.borderRadius}
          min={0}
          max={200}
          onChange={(v) => patch({ borderRadius: v })}
        />
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Opacity ({options.opacity}%)
          <input
            type="range"
            min={0}
            max={100}
            value={options.opacity}
            onChange={(e) => patch({ opacity: Number(e.target.value) })}
            aria-label="Shadow opacity"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Color
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(options.color) ? options.color : "#000000"}
              onChange={(e) => patch({ color: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-sm border border-border-default bg-bg-raised p-0.5"
              aria-label="Shadow color picker"
            />
            <input
              value={options.color}
              onChange={(e) => patch({ color: e.target.value })}
              className="w-24 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
              aria-label="Shadow color hex value"
            />
          </div>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.inset}
            onChange={(e) => patch({ inset: e.target.checked })}
            aria-label="Inset shadow"
          />
          Inset
        </label>
      </div>

      <div className="flex h-40 items-center justify-center rounded-md border border-border-default bg-bg-subtle">
        <div
          className="h-24 w-40 bg-bg-raised"
          style={{ boxShadow: previewShadow, borderRadius: `${options.borderRadius}px` }}
          aria-hidden="true"
        />
      </div>

      <div className="min-h-[100px]">
        <OutputPane
          value={result.output}
          error={result.error?.message ?? null}
          label="Generated CSS"
          placeholder="Generated CSS will appear here"
        />
      </div>
    </div>
  );
}
