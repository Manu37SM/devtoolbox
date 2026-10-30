"use client";

import { useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Button } from "@/components/ui/button";
import { compressImage, type ImageCompressorResult } from "./transform";
import type { ImageCompressorOptions } from "./schema";
import { computeSizeReductionPercent, formatBytes, mimeToExtension } from "@/lib/image-canvas";

export function ImageCompressorToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<ImageCompressorOptions>({ format: "image/jpeg", quality: 80, maxDimension: 0, targetSizeKb: 0, background: "#ffffff" });
  const [result, setResult] = useState<ImageCompressorResult | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) {
      setResult(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setIsProcessing(true);
    compressImage(file, options).then((res) => {
      if (cancelled) return;
      setIsProcessing(false);
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else {
        setError(null);
        setResult(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [file, options]);

  const reductionPercent = result ? computeSizeReductionPercent(result.originalSize, result.compressedSize) : 0;

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <ImageDropzone
          label="Image"
          accept="image/jpeg,image/png,image/webp"
          onFileSelect={setFile}
          currentFileName={file?.name ?? null}
          onClear={() => setFile(null)}
          previewSlot={
            previewUrl ? (

              <img src={previewUrl} alt="Original preview" className="max-h-[200px] max-w-full object-contain" />
            ) : null
          }
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {isProcessing && <p className="text-sm text-text-muted">Compressing…</p>}

        {result && !error && (
          <>
            <p className="text-sm text-text-secondary">
              {formatBytes(result.originalSize)} → {formatBytes(result.compressedSize)}
              {reductionPercent > 0 ? ` (${reductionPercent}% smaller)` : ""}
              {result.width ? ` · ${result.width}×${result.height}px` : ""}
              {result.quality ? ` · quality ${result.quality}` : ""}
            </p>
            {result.warning && <p className="text-xs text-warning">{result.warning}</p>}
            <div className="flex items-center justify-center rounded-md border border-border-subtle bg-bg-raised p-6">
              {}
              <img src={result.dataUrl} alt="Compressed result" className="max-w-full" />
            </div>
            <a href={result.dataUrl} download={`compressed.${mimeToExtension(options.format)}`}>
              <Button variant="secondary" size="sm">
                Download
              </Button>
            </a>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Format
          <select
            value={options.format}
            onChange={(e) =>
              setOptions((o) => ({ ...o, format: e.target.value as ImageCompressorOptions["format"] }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Quality ({options.quality})
          <input
            type="range"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => setOptions((o) => ({ ...o, quality: Number(e.target.value) }))}
            aria-label="Compression quality"
            disabled={options.targetSizeKb > 0}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Target size (KB, 0 = off)
          <input
            type="number"
            min={0}
            max={100000}
            value={options.targetSizeKb}
            onChange={(e) =>
              setOptions((o) => ({ ...o, targetSizeKb: Math.min(100000, Math.max(0, Math.round(Number(e.target.value) || 0))) }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          />
          <span className="text-xs text-text-muted">Picks the highest quality that fits.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Max width/height
          <select
            value={options.maxDimension}
            onChange={(e) => setOptions((o) => ({ ...o, maxDimension: Number(e.target.value) }))}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value={0}>Original size</option>
            <option value={3840}>3840 px (4K)</option>
            <option value={2560}>2560 px</option>
            <option value={1920}>1920 px (Full HD)</option>
            <option value={1280}>1280 px</option>
            <option value={1024}>1024 px</option>
            <option value={800}>800 px</option>
            <option value={512}>512 px</option>
          </select>
        </label>
        {options.format === "image/jpeg" && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Background for transparent areas
            <input
              type="color"
              value={options.background}
              onChange={(e) => setOptions((o) => ({ ...o, background: e.target.value }))}
            />
          </label>
        )}
      </div>
    </div>
  );
}
