"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { hashFile, hashText } from "./transform";
import { HASH_ALGORITHMS, type HashAlgorithm, type HashGeneratorOptions } from "./schema";


type InputMode = "text" | "file";

export function HashGeneratorToolView() {
  const [mode, setMode] = useState<InputMode>("text");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<HashGeneratorOptions>({
    algorithm: "SHA-256",
    uppercase: false,
    outputEncoding: "hex",
    inputFormat: "text",
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expected, setExpected] = useState("");
  // Hex comparisons ignore case, spaces and colons; Base64 must match exactly.
  const normalise = (v: string) =>
    options.outputEncoding === "hex" ? v.replace(/[\s:]/g, "").toLowerCase() : v.trim();
  const comparison = expected.trim() && output ? (normalise(expected) === normalise(output) ? "match" : "mismatch") : null;

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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Algorithm
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.algorithm}
            onChange={(e) => setOptions((o) => ({ ...o, algorithm: e.target.value as HashAlgorithm }))}
          >
            {HASH_ALGORITHMS.map((algo) => (
              <option key={algo} value={algo}>
                {algo}
              </option>
            ))}
          </select>
        </label>
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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.outputEncoding}
            onChange={(e) => setOptions((o) => ({ ...o, outputEncoding: e.target.value as HashGeneratorOptions["outputEncoding"] }))}
          >
            <option value="hex">Hex</option>
            <option value="base64">Base64</option>
            <option value="base64url">Base64URL</option>
          </select>
        </label>
        {mode === "text" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input as
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.inputFormat}
            onChange={(e) => setOptions((o) => ({ ...o, inputFormat: e.target.value as HashGeneratorOptions["inputFormat"] }))}
          >
            <option value="text">Text (UTF-8)</option>
            <option value="hex">Hex bytes</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Expected
          <input
            type="text"
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="Paste a checksum to compare"
            aria-label="Expected hash to compare against"
            className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-xs"
          />
        </label>
        {comparison && (
          <span
            role="status"
            className={`rounded-sm px-2 py-0.5 text-xs font-medium ${comparison === "match" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}
          >
            {comparison === "match" ? "Matches" : "Does not match"}
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              {mode === "text" ? (
                <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text to hash" />
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
