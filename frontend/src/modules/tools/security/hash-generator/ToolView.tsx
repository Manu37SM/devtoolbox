"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { hashFile, hashText } from "./transform";
import type { HashAlgorithm, HashGeneratorOptions } from "./schema";

const ALGORITHMS: HashAlgorithm[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

/** FEATURE.md's Module 3 row specifies "Text + file input" for this tool —
 * file support (checksumming a downloaded file/artifact) was missing until
 * this cleanup pass. Text and file inputs are mutually exclusive modes
 * rather than both feeding the same hash simultaneously, since hashing
 * "text + a file" together isn't a coherent single operation. */
type InputMode = "text" | "file";

export function HashGeneratorToolView() {
  const [mode, setMode] = useState<InputMode>("text");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<HashGeneratorOptions>({
    algorithm: "SHA-256",
    uppercase: false,
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (mode === "file") {
      if (!file) {
        setOutput("");
        setError(null);
        return;
      }
      hashFile(file, options).then((result) => {
        if (cancelled) return;
        setOutput(result.output);
        setError(result.error?.message ?? null);
      });
    } else {
      hashText(input, options).then((result) => {
        if (cancelled) return;
        setOutput(result.output);
        setError(result.error?.message ?? null);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [mode, input, file, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {ALGORITHMS.map((algo) => (
            <button
              key={algo}
              className={`px-3 py-1.5 text-xs font-medium transition-colors duration-fast ${
                options.algorithm === algo
                  ? "bg-accent text-accent-foreground"
                  : "text-text-secondary hover:bg-bg-raised"
              }`}
              onClick={() => setOptions((o) => ({ ...o, algorithm: algo }))}
            >
              {algo}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={mode === "text" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setMode("text")}
          >
            Text
          </Button>
          <Button
            variant={mode === "file" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setMode("file")}
          >
            File
          </Button>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.uppercase}
            onChange={(e) => setOptions((o) => ({ ...o, uppercase: e.target.checked }))}
          />
          Uppercase
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              {mode === "text" ? (
                <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text to hash" />
              ) : (
                <div className="flex flex-1 flex-col items-start gap-2 rounded-md border border-dashed border-border-default p-4">
                  <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                    Choose file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                    aria-label="File to hash"
                  />
                  <p className="text-sm text-text-secondary">
                    {file ? `${file.name} (${file.size.toLocaleString()} bytes)` : "No file selected"}
                  </p>
                </div>
              )}
            </div>
          }
          output={<OutputPane label="Hash" value={output} error={error} />}
        />
      </div>
    </div>
  );
}
