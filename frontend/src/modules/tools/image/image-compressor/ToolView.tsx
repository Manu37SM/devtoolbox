"use client";

import { useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Button } from "@/components/ui/button";
import { compressImage } from "./transform";
import type { ImageCompressorOptions } from "./schema";
import { computeSizeReductionPercent, formatBytes, mimeToExtension } from "@/lib/image-canvas";

export function ImageCompressorToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<ImageCompressorOptions>({ format: "image/jpeg", quality: 80 });
  const [result, setResult] = useState<{ dataUrl: string; originalSize: number; compressedSize: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Preview of the ORIGINAL image, shown inside the dropzone once loaded.
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
              // eslint-disable-next-line @next/next/no-img-element
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
            </p>
            <div className="flex items-center justify-center rounded-md border border-border-subtle bg-bg-raised p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
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
          />
        </label>
      </div>
    </div>
  );
}
