"use client";

import { useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { simulateColorBlindnessOnImage } from "./transform";
import type { ColorBlindnessType } from "./schema";

const TYPES: { value: ColorBlindnessType; label: string }[] = [
  { value: "protanopia", label: "Protanopia (red-weak)" },
  { value: "deuteranopia", label: "Deuteranopia (green-weak)" },
  { value: "tritanopia", label: "Tritanopia (blue-weak)" },
  { value: "achromatopsia", label: "Achromatopsia (full color blindness)" },
];

export function ColorBlindnessSimulatorToolView() {
  const [type, setType] = useState<ColorBlindnessType>("deuteranopia");
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setOriginalUrl(URL.createObjectURL(file));
    const result = await simulateColorBlindnessOnImage(file, type);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setResultUrl(null);
    } else {
      setResultUrl(result.dataUrl);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Simulation type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ColorBlindnessType)}
          className="w-64 rounded-sm border border-border-default bg-bg-raised px-2 py-2"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <ImageDropzone onFileSelect={handleFile} label="Image to simulate" />

      {error && (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {busy && <div className="text-sm text-text-muted">Processing…</div>}

      {(originalUrl || resultUrl) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {originalUrl && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Original</span>
              {}
              <img src={originalUrl} alt="Original upload" className="max-h-72 w-full rounded-md border border-border-default object-contain" />
            </div>
          )}
          {resultUrl && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Simulated</span>
              {}
              <img src={resultUrl} alt="Color blindness simulation result" className="max-h-72 w-full rounded-md border border-border-default object-contain" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
