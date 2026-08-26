"use client";

import { useCallback, useEffect, useState } from "react";
import { ImageDropzone } from "@/components/tools/ImageDropzone";
import { OutputPane } from "@/components/tools/OutputPane";
import { decodeQrCode } from "./transform";

export function QrCodeReaderToolView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const handleFileSelect = useCallback((selected: File) => {
    setFile(selected);
    setText(null);
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setFile(null);
    setText(null);
    setError(null);
  }, []);

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
    if (!file) return;
    let cancelled = false;
    setIsDecoding(true);
    decodeQrCode(file).then((result) => {
      if (cancelled) return;
      setText(result.text);
      setError(result.error);
      setIsDecoding(false);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-2">
      <ImageDropzone
        onFileSelect={handleFileSelect}
        accept="image/*"
        label="QR code image"
        currentFileName={file?.name ?? null}
        onClear={handleClear}
        previewSlot={
          previewUrl ? (

            <img src={previewUrl} alt="Uploaded image to scan for a QR code" className="max-h-[220px] max-w-full object-contain" />
          ) : undefined
        }
      />

      <div className="flex flex-col gap-2">
        {isDecoding ? (
          <p className="text-sm text-text-secondary" aria-live="polite">
            Scanning image for a QR code…
          </p>
        ) : file && !error && text === null ? (
          <p role="status" className="text-sm text-text-secondary">
            No QR code found in this image.
          </p>
        ) : null}
        <OutputPane
          label="Decoded content"
          value={text ?? ""}
          error={error}
          placeholder="Upload an image with a QR code to decode its content"
        />
      </div>
    </div>
  );
}
