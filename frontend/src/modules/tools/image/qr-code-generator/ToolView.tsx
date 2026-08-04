"use client";

import { useEffect, useState } from "react";
import { generateQrCode } from "./transform";
import type { QrCodeGeneratorOptions } from "./schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function QrCodeGeneratorToolView() {
  const [text, setText] = useState("https://example.com");
  const [options, setOptions] = useState<QrCodeGeneratorOptions>({
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
    darkColor: "#000000",
    lightColor: "#ffffff",
  });
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    generateQrCode(text, options).then((result) => {
      if (cancelled) return;
      setDataUrl(result.dataUrl);
      setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [text, options]);

  return (
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-text-secondary">Text or URL</label>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-28"
          aria-label="QR code content"
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex items-center justify-center rounded-md border border-border-subtle bg-bg-raised p-6">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="Generated QR code" className="max-w-full" />
          ) : (
            <span className="text-sm text-text-muted">Enter text to generate a QR code</span>
          )}
        </div>
        {dataUrl && (
          <a href={dataUrl} download="qrcode.png">
            <Button variant="secondary" size="sm">
              Download PNG
            </Button>
          </a>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Error correction
          <select
            value={options.errorCorrectionLevel}
            onChange={(e) =>
              setOptions((o) => ({ ...o, errorCorrectionLevel: e.target.value as "L" | "M" | "Q" | "H" }))
            }
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            <option value="L">Low (7%)</option>
            <option value="M">Medium (15%)</option>
            <option value="Q">Quartile (25%)</option>
            <option value="H">High (30%)</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Dark color
          <input
            type="color"
            value={options.darkColor}
            onChange={(e) => setOptions((o) => ({ ...o, darkColor: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Light color
          <input
            type="color"
            value={options.lightColor}
            onChange={(e) => setOptions((o) => ({ ...o, lightColor: e.target.value }))}
          />
        </label>
      </div>
    </div>
  );
}
