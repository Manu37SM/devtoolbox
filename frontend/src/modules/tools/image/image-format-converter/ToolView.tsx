"use client";

import { useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Button } from "@/components/ui/button";
import { convertImageFormat } from "./transform";
import { isQualityRelevant, type ImageFormatConverterOptions } from "./schema";
import { mimeToExtension } from "@/lib/image-canvas";

export function ImageFormatConverterToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<ImageFormatConverterOptions>({ targetFormat: "image/png", quality: 92, maxDimension: 0, background: "#ffffff" });
  const [dataUrl, setDataUrl] = useState("");
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
      setDataUrl("");
      setError(null);
      return;
    }
    let cancelled = false;
    setIsProcessing(true);
    convertImageFormat(file, options).then((res) => {
      if (cancelled) return;
      setIsProcessing(false);
      setDataUrl(res.dataUrl);
      setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [file, options]);

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <ImageDropzone
          label="Image"
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
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
        {isProcessing && <p className="text-sm text-text-muted">Converting…</p>}

        {dataUrl && !error && (
          <>
            <div className="flex items-center justify-center rounded-md border border-border-subtle bg-bg-raised p-6">
              {}
              <img src={dataUrl} alt="Converted result" className="max-w-full" />
            </div>
            <a href={dataUrl} download={`converted.${mimeToExtension(options.targetFormat)}`}>
              <Button variant="secondary" size="sm">
                Download
              </Button>
            </a>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Target format
          <select
            value={options.targetFormat}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                targetFormat: e.target.value as ImageFormatConverterOptions["targetFormat"],
              }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        {isQualityRelevant(options.targetFormat) && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Quality ({options.quality})
            <input
              type="range"
              min={1}
              max={100}
              value={options.quality}
              onChange={(e) => setOptions((o) => ({ ...o, quality: Number(e.target.value) }))}
              aria-label="Output quality"
            />
          </label>
        )}
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
        {options.targetFormat === "image/jpeg" && (
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
