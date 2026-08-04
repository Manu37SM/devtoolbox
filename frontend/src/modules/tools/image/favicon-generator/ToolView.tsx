"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Button } from "@/components/ui/button";
import { generateFavicons, bundleFaviconsAsZip, type GeneratedFaviconImage } from "./transform";
import { STANDARD_FAVICON_SIZES } from "./schema";

export function FaviconGeneratorToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<GeneratedFaviconImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zipUrl, setZipUrl] = useState<string | null>(null);

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
    generateFavicons(file, [...STANDARD_FAVICON_SIZES]).then((result) => {
      if (cancelled) return;
      setImages(result.images);
      setError(result.error);
      setIsGenerating(false);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    if (images.length === 0) {
      setZipUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    bundleFaviconsAsZip(images).then((zipBlob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(zipBlob);
      setZipUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [images]);

  return (
    <div className="flex h-full flex-col gap-4">
      <ImageDropzone
        onFileSelect={handleFileSelect}
        accept="image/*"
        label="Source image"
        currentFileName={file?.name ?? null}
        onClear={handleClear}
      />

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
