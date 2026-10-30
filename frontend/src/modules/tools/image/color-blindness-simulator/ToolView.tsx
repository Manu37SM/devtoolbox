"use client";

import { useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { simulateColorBlindnessOnImage } from "./transform";
import type { ColorBlindnessSimulatorOptions, ColorBlindnessType } from "./schema";
import { Download } from "lucide-react";

const TYPES: { value: ColorBlindnessType; label: string; short: string }[] = [
  { value: "protanopia", label: "Protanopia / protanomaly (red-weak)", short: "Protan (red)" },
  { value: "deuteranopia", label: "Deuteranopia / deuteranomaly (green-weak)", short: "Deutan (green)" },
  { value: "tritanopia", label: "Tritanopia / tritanomaly (blue-weak)", short: "Tritan (blue)" },
  { value: "achromatopsia", label: "Achromatopsia (no colour)", short: "Achromatopsia" },
];

const CLS_LABEL = "flex flex-col gap-1 text-sm text-text-secondary";

export function ColorBlindnessSimulatorToolView() {
  const [type, setType] = useState<ColorBlindnessType>("deuteranopia");
  const [model, setModel] = useState<ColorBlindnessSimulatorOptions["model"]>("machado");
  const [severity, setSeverity] = useState(100);
  const [compareAll, setCompareAll] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [results, setResults] = useState<{ type: ColorBlindnessType; url: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    const types = compareAll ? TYPES.map((t) => t.value) : [type];
    setBusy(true);
    // A short delay lets the severity slider settle before re-rendering big images.
    const id = setTimeout(async () => {
      const out: { type: ColorBlindnessType; url: string }[] = [];
      for (const t of types) {
        const r = await simulateColorBlindnessOnImage(file, t, { model, severity });
        if (cancelled) return;
        if (r.error) {
          setError(r.error);
          setResults([]);
          setBusy(false);
          return;
        }
        out.push({ type: t, url: r.dataUrl });
      }
      setError(null);
      setResults(out);
      setBusy(false);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [file, type, model, severity, compareAll]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        {!compareAll && (
          <label className={CLS_LABEL}>
            Simulation type
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ColorBlindnessType)}
              className="w-72 rounded-sm border border-border-default bg-bg-raised px-2 py-2"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={CLS_LABEL}>
          Severity: {severity}% {severity === 100 ? "(-opia)" : severity === 0 ? "(normal vision)" : "(-omaly)"}
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="w-48"
            aria-label="Severity"
          />
        </label>
        <label className={CLS_LABEL}>
          Model
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as ColorBlindnessSimulatorOptions["model"])}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="machado">Machado 2009 (as in Chrome DevTools)</option>
            <option value="simple">Simple approximation (legacy)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm text-text-secondary">
          <input type="checkbox" checked={compareAll} onChange={(e) => setCompareAll(e.target.checked)} />
          Compare all types
        </label>
      </div>

      <ImageDropzone onFileSelect={setFile} label="Image to simulate" />

      {error && (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {busy && <div className="text-sm text-text-muted">Processing…</div>}

      {(originalUrl || results.length > 0) && (
        <div className={`grid grid-cols-1 gap-3 ${compareAll ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"}`}>
          {originalUrl && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Original</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalUrl} alt="Original upload" className="max-h-72 w-full rounded-md border border-border-default object-contain" />
            </div>
          )}
          {results.map((r) => (
            <div key={r.type} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {TYPES.find((t) => t.value === r.type)!.short}
                  {severity < 100 ? ` ${severity}%` : ""}
                </span>
                <a
                  href={r.url}
                  download={`simulated-${r.type}-${severity}.png`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Download PNG
                </a>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.url} alt={`${r.type} simulation`} className="max-h-72 w-full rounded-md border border-border-default object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
