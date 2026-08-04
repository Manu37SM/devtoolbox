"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { compressText } from "./transform";
import type { GzipDeflateOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

const defaultOptions: GzipDeflateOptions = { format: "gzip", mode: "compress" };
const emptyResult: TransformResult = { output: "", error: null };

export function GzipDeflateToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<GzipDeflateOptions>(defaultOptions);
  const [result, setResult] = useState<TransformResult>(emptyResult);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    compressText(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  const sizeLine = getSizeLine(input, options, result);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "compress" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "compress" }))}
          >
            Compress
          </Button>
          <Button
            variant={options.mode === "decompress" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "decompress" }))}
          >
            Decompress
          </Button>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) =>
              setOptions((o) => ({ ...o, format: e.target.value as GzipDeflateOptions["format"] }))
            }
          >
            <option value="gzip">Gzip</option>
            <option value="deflate">Deflate</option>
            <option value="deflate-raw">Deflate (raw)</option>
          </select>
        </label>
      </div>
      {sizeLine && <p className="text-sm text-text-secondary">{sizeLine}</p>}
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  options.mode === "compress" ? "Text to compress" : "Base64-encoded compressed data"
                }
                aria-label="Gzip/Deflate input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Result will appear here"
            />
          }
        />
      </div>
    </div>
  );
}

function getSizeLine(input: string, options: GzipDeflateOptions, result: TransformResult): string | null {
  if (result.error || result.output.length === 0) return null;

  if (options.mode === "compress") {
    const originalBytes = new TextEncoder().encode(input).length;
    const compressedBytes = atob(result.output).length;
    if (originalBytes === 0) return null;
    const change = Math.round((1 - compressedBytes / originalBytes) * 100);
    const direction = change >= 0 ? "smaller" : "larger";
    return `Original: ${originalBytes} bytes → Compressed: ${compressedBytes} bytes (${Math.abs(change)}% ${direction})`;
  }

  const compressedBytes = atob(input.trim()).length;
  const decompressedBytes = new TextEncoder().encode(result.output).length;
  return `Compressed: ${compressedBytes} bytes → Decompressed: ${decompressedBytes} bytes`;
}
