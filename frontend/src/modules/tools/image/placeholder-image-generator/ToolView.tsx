"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generatePlaceholderImage, placeholderImageToDataUri } from "./transform";
import { placeholderImageOptionsSchema, type PlaceholderImageOptions } from "./schema";

const defaultOptions: PlaceholderImageOptions = { ...placeholderImageOptionsSchema.parse({}), text: "" };

const PRESETS: { label: string; w: number; h: number }[] = [
  { label: "Open Graph / social share", w: 1200, h: 630 },
  { label: "X / Twitter card", w: 1200, h: 675 },
  { label: "Full HD banner", w: 1920, h: 1080 },
  { label: "Hero 16:9", w: 1280, h: 720 },
  { label: "Square post", w: 1080, h: 1080 },
  { label: "Story / reel", w: 1080, h: 1920 },
  { label: "Avatar", w: 256, h: 256 },
  { label: "Thumbnail 4:3", w: 400, h: 300 },
  { label: "Leaderboard ad", w: 728, h: 90 },
];

function downloadPng(dataUri: string, w: number, h: number) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `placeholder-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  };
  img.src = dataUri;
}

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Preset size
          <select
            value=""
            onChange={(e) => {
              const p = PRESETS[Number(e.target.value)];
              if (p) patch({ width: p.w, height: p.h });
            }}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm"
          >
            <option value="">Choose…</option>
            {PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label} — {p.w}×{p.h}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Font size (0 = auto)
          <input
            type="number"
            min={0}
            max={500}
            value={options.fontSize}
            onChange={(e) => patch({ fontSize: Math.min(500, Math.max(0, Number(e.target.value) || 0)) })}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Corner radius (px)
          <input
            type="number"
            min={0}
            max={2000}
            value={options.cornerRadius}
            onChange={(e) => patch({ cornerRadius: Math.min(2000, Math.max(0, Number(e.target.value) || 0)) })}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Pattern
          <select
            value={options.pattern}
            onChange={(e) => patch({ pattern: e.target.value as PlaceholderImageOptions["pattern"] })}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            <option value="cross">Crossed lines</option>
            <option value="grid">Grid</option>
          </select>
        </label>
      </div>
      <label className="flex items-center gap-1.5 text-sm text-text-secondary">
        <input type="checkbox" checked={options.showDimensions} onChange={(e) => patch({ showDimensions: e.target.checked })} />
        Show dimensions under custom text
      </label>
      {result.error === null && (
        <div className="flex items-center justify-center overflow-auto rounded-md border border-border-default bg-bg-subtle p-3">
          {}
          <img src={dataUri} alt="Placeholder preview" className="max-h-64 max-w-full" />
        </div>
      )}
      {result.error === null && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadPng(dataUri, options.width, options.height)}
            className="rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-subtle"
          >
            Download PNG
          </button>
          <a
            href={dataUri}
            download={`placeholder-${options.width}x${options.height}.svg`}
            className="rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-subtle"
          >
            Download SVG
          </a>
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
