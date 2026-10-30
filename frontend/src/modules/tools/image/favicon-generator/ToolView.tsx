"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Button } from "@/components/ui/button";
import { generateFavicons, bundleFaviconsAsZip, type GeneratedFaviconImage } from "./transform";
import { faviconGeneratorOptionsSchema, STANDARD_FAVICON_SIZES, type FaviconGeneratorOptions } from "./schema";

export function FaviconGeneratorToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<GeneratedFaviconImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [options, setOptions] = useState<FaviconGeneratorOptions>(() => faviconGeneratorOptionsSchema.parse({}));

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setImages([]);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setImages([]);
    setError(null);
  }, []);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setIsGenerating(true);
    generateFavicons(file, [...STANDARD_FAVICON_SIZES], options).then((result) => {
      if (cancelled) return;
      setImages(result.images);
      setError(result.error);
      setIsGenerating(false);
    });
    return () => {
      cancelled = true;
    };
  }, [file, options]);

  useEffect(() => {
    if (images.length === 0) {
      setZipUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    bundleFaviconsAsZip(images, {
      full: options.bundle === "full",
      appName: options.appName,
      themeColor: options.background || "#ffffff",
    }).then((zipBlob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(zipBlob);
      setZipUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [images, options.bundle, options.appName, options.background]);

  return (
    <div className="flex h-full flex-col gap-4">
      <ImageDropzone
        onFileSelect={handleFileSelect}
        accept="image/*"
        label="Source image"
        currentFileName={file?.name ?? null}
        onClear={handleClear}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Padding %
          <input
            type="number"
            min={0}
            max={40}
            value={options.padding}
            onChange={(e) => setOptions((o) => ({ ...o, padding: Math.min(40, Math.max(0, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Rounded corners %
          <input
            type="number"
            min={0}
            max={50}
            value={options.cornerRadius}
            onChange={(e) => setOptions((o) => ({ ...o, cornerRadius: Math.min(50, Math.max(0, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Fit
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.fit}
            onChange={(e) => setOptions((o) => ({ ...o, fit: e.target.value as FaviconGeneratorOptions["fit"] }))}
          >
            <option value="contain">Fit inside</option>
            <option value="cover">Fill & crop</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.background !== ""}
            onChange={(e) => setOptions((o) => ({ ...o, background: e.target.checked ? "#ffffff" : "" }))}
          />
          Background
          {options.background !== "" && (
            <input
              type="color"
              aria-label="Background colour"
              value={options.background}
              onChange={(e) => setOptions((o) => ({ ...o, background: e.target.value }))}
            />
          )}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Zip contents
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.bundle}
            onChange={(e) => setOptions((o) => ({ ...o, bundle: e.target.value as FaviconGeneratorOptions["bundle"] }))}
          >
            <option value="full">Full set (ico, manifest, snippet)</option>
            <option value="basic">PNGs only</option>
          </select>
        </label>
        {options.bundle === "full" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            App name
            <input
              type="text"
              value={options.appName}
              placeholder="My App"
              onChange={(e) => setOptions((o) => ({ ...o, appName: e.target.value }))}
              className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
            />
          </label>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {isGenerating && (
        <p className="text-sm text-text-secondary" aria-live="polite">
          Generating favicon sizes…
        </p>
      )}

      {images.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4">
            {images.map((img) => (
              <div key={img.size} className="flex flex-col items-center gap-1.5">
                <div
                  className="flex items-center justify-center rounded-md border border-border-default bg-bg-raised p-2"
                  style={{ width: 72, height: 72 }}
                >
                  {}
                  <img
                    src={img.dataUrl}
                    alt={`${img.size}x${img.size} favicon preview`}
                    style={{ maxWidth: Math.min(img.size, 56), maxHeight: Math.min(img.size, 56) }}
                  />
                </div>
                <span className="font-mono text-xs text-text-muted">
                  {img.size}×{img.size}
                </span>
                <a href={img.dataUrl} download={`favicon-${img.size}x${img.size}.png`}>
                  <Button variant="ghost" size="sm">
                    Download
                  </Button>
                </a>
              </div>
            ))}
          </div>

          {zipUrl && (
            <a href={zipUrl} download="favicons.zip">
              <Button variant="secondary" size="sm">
                Download all sizes (.zip)
              </Button>
            </a>
          )}
        </>
      )}
    </div>
  );
}
