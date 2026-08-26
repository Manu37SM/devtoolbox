"use client";

import { useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { exportSvg } from "./transform";
import type { SvgExporterOptions } from "./schema";
import { mimeToExtension } from "@/lib/image-canvas";

const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <circle cx="50" cy="50" r="40" fill="#3b82f6" />\n</svg>';

export function SvgExporterToolView() {
  const [svgMarkup, setSvgMarkup] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [options, setOptions] = useState<SvgExporterOptions>({
    outputFormat: "image/png",
    width: 512,
    height: 512,
    quality: 92,
    backgroundColor: "transparent",
  });
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  function handleFileSelect(file: File) {
    setFileName(file.name);
    file.text().then(setSvgMarkup);
  }

  function handleTextChange(value: string) {

    setFileName(null);
    setSvgMarkup(value);
  }

  useEffect(() => {
    if (!svgMarkup.trim()) {
      setDataUrl("");
      setError(null);
      return;
    }
    let cancelled = false;
    setIsProcessing(true);
    exportSvg(svgMarkup, options).then((res) => {
      if (cancelled) return;
      setIsProcessing(false);
      setDataUrl(res.dataUrl);
      setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [svgMarkup, options]);

  const isJpeg = options.outputFormat === "image/jpeg";

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-text-secondary">SVG markup</label>
        <Textarea
          value={svgMarkup}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={PLACEHOLDER_SVG}
          className="h-40"
          aria-label="SVG markup"
        />

        <ImageDropzone
          label="Or upload an .svg file"
          accept=".svg,image/svg+xml"
          onFileSelect={handleFileSelect}
          currentFileName={fileName}
          onClear={() => {
            setFileName(null);
            setSvgMarkup("");
          }}
        />

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {isProcessing && <p className="text-sm text-text-muted">Rasterizing…</p>}

        {dataUrl && !error && (
          <>
            <div className="flex items-center justify-center rounded-md border border-border-subtle bg-bg-raised p-6">
              {}
              <img src={dataUrl} alt="Rasterized result" className="max-w-full" />
            </div>
            <a href={dataUrl} download={`exported.${mimeToExtension(options.outputFormat)}`}>
              <Button variant="secondary" size="sm">
                Download
              </Button>
            </a>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Output format
          <select
            value={options.outputFormat}
            onChange={(e) =>
              setOptions((o) => ({ ...o, outputFormat: e.target.value as SvgExporterOptions["outputFormat"] }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="image/png">PNG</option>
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Width (px)
          <input
            type="number"
            min={1}
            max={8000}
            value={options.width}
            onChange={(e) => setOptions((o) => ({ ...o, width: Number(e.target.value) }))}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Height (px)
          <input
            type="number"
            min={1}
            max={8000}
            value={options.height}
            onChange={(e) => setOptions((o) => ({ ...o, height: Number(e.target.value) }))}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          />
        </label>
        {options.outputFormat !== "image/png" && (
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
          Background
          <input
            type="color"
            value={options.backgroundColor === "transparent" ? "#ffffff" : options.backgroundColor}
            onChange={(e) => setOptions((o) => ({ ...o, backgroundColor: e.target.value }))}
          />
        </label>
        <button
          type="button"
          onClick={() => setOptions((o) => ({ ...o, backgroundColor: "transparent" }))}
          className="text-left text-xs text-accent hover:underline"
        >
          Use transparent background
        </button>
        {isJpeg && options.backgroundColor === "transparent" && (
          <p className="text-xs text-text-muted">JPEG doesn&apos;t support transparency — exported as white.</p>
        )}
      </div>
    </div>
  );
}
