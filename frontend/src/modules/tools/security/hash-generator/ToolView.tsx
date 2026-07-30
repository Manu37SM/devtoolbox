"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { hashText } from "./transform";
import type { HashAlgorithm, HashGeneratorOptions } from "./schema";

const ALGORITHMS: HashAlgorithm[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

export function HashGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<HashGeneratorOptions>({
    algorithm: "SHA-256",
    uppercase: false,
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    hashText(input, options).then((result) => {
      if (cancelled) return;
      setOutput(result.output);
      setError(result.error?.message ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [input, options]);

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
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label="Text to hash"
              />
            </div>
          }
          output={<OutputPane label="Hash" value={output} error={error} />}
        />
      </div>
    </div>
  );
}
