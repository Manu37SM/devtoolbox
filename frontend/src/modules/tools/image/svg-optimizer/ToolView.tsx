"use client";

import { useMemo, useState } from "react";
import { DualPane } from "@/components/tools/DualPane";
import { OutputPane } from "@/components/tools/OutputPane";
import { Textarea } from "@/components/ui/textarea";
import { optimizeSvg } from "./transform";
import type { SvgOptimizerOptions } from "./schema";

const defaultOptions: SvgOptimizerOptions = { pluginsPreset: "default", removeViewBox: false, multipass: true };

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#6366f1" />
</svg>`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export function SvgOptimizerToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SvgOptimizerOptions>(defaultOptions);

  const result = useMemo(() => optimizeSvg(input, options), [input, options]);

  const savedPercent =
    result.inputBytes > 0 ? Math.round((1 - result.outputBytes / result.inputBytes) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Optimization level
          <select
            value={options.pluginsPreset}
            onChange={(e) =>
              setOptions((o) => ({ ...o, pluginsPreset: e.target.value as SvgOptimizerOptions["pluginsPreset"] }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="default">Default</option>
            <option value="safe">Safe (no geometry rewriting)</option>
            <option value="minimal">Minimal (cleanup only)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.removeViewBox}
            onChange={(e) => setOptions((o) => ({ ...o, removeViewBox: e.target.checked }))}
          />
          Remove viewBox
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.multipass}
            onChange={(e) => setOptions((o) => ({ ...o, multipass: e.target.checked }))}
          />
          Multipass
        </label>
        <button
          type="button"
          onClick={() => setInput(SAMPLE_SVG)}
          className="text-xs text-accent hover:underline"
        >
          Load sample SVG
        </button>
      </div>

      {input.trim().length > 0 && !result.error && (
        <p className="text-sm text-text-secondary" aria-live="polite">
          {formatBytes(result.inputBytes)} &rarr; {formatBytes(result.outputBytes)}{" "}
          <span className={savedPercent > 0 ? "text-success" : "text-text-muted"}>
            ({savedPercent > 0 ? `-${savedPercent}%` : "no change"})
          </span>
        </p>
      )}

      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">SVG markup</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste SVG markup here"
                aria-label="SVG input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Optimized SVG will appear here"
              label="Optimized SVG"
            />
          }
        />
      </div>
    </div>
  );
}
