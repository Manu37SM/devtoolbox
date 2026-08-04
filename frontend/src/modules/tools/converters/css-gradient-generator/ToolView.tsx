"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateGradientCss } from "./transform";
import type { CssGradientGeneratorOptions } from "./schema";

const defaultOptions: CssGradientGeneratorOptions = {
  type: "linear",
  angle: 90,
  stops: [
    { color: "#6366f1", position: 0 },
    { color: "#ec4899", position: 100 },
  ],
};

export function CssGradientGeneratorToolView() {
  const [options, setOptions] = useState<CssGradientGeneratorOptions>(defaultOptions);

  const result = useMemo(() => generateGradientCss(options), [options]);

  const updateStop = (index: number, patch: Partial<{ color: string; position: number }>) => {
    setOptions((o) => ({
      ...o,
      stops: o.stops.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)),
    }));
  };

  const addStop = () => {
    setOptions((o) => ({
      ...o,
      stops: [...o.stops, { color: "#ffffff", position: 50 }],
    }));
  };

  const removeStop = (index: number) => {
    setOptions((o) => {
      if (o.stops.length <= 2) return o;
      return { ...o, stops: o.stops.filter((_, i) => i !== index) };
    });
  };

  const previewBackground =
    result.error === null
      ? result.output.replace(/^background:\s*/, "").replace(/;$/, "")
      : "none";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Type
          <select
            value={options.type}
            onChange={(e) =>
              setOptions((o) => ({ ...o, type: e.target.value as CssGradientGeneratorOptions["type"] }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
            <option value="conic">Conic</option>
          </select>
        </label>

        {(options.type === "linear" || options.type === "conic") && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Angle ({options.angle}°)
            <input
              type="range"
              min={0}
              max={360}
              value={options.angle}
              onChange={(e) => setOptions((o) => ({ ...o, angle: Number(e.target.value) }))}
              className="w-40"
              aria-label="Gradient angle"
            />
          </label>
        )}
      </div>

      <div
        className="h-32 w-full rounded-md border border-border-default"
        style={{ background: previewBackground }}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Color stops</span>
          <Button variant="ghost" size="sm" onClick={addStop}>
            <Plus className="h-3.5 w-3.5" />
            Add stop
          </Button>
        </div>
        {options.stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(stop.color) ? stop.color : "#000000"}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="h-9 w-9 cursor-pointer rounded-sm border border-border-default bg-bg-raised p-0.5"
              aria-label={`Stop ${i + 1} color picker`}
            />
            <input
              value={stop.color}
              onChange={(e) => updateStop(i, { color: e.target.value })}
              className="w-28 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
              aria-label={`Stop ${i + 1} hex value`}
            />
            <input
              type="range"
              min={0}
              max={100}
              value={stop.position}
              onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
              className="flex-1"
              aria-label={`Stop ${i + 1} position`}
            />
            <span className="w-10 shrink-0 text-right font-mono text-xs text-text-muted">{stop.position}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeStop(i)}
              disabled={options.stops.length <= 2}
              aria-label={`Remove stop ${i + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
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
