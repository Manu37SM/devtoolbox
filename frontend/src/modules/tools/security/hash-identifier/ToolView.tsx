"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { identifyHashes } from "./transform";
import type { HashIdentifierOptions } from "./schema";

type Options = HashIdentifierOptions;

const defaultOptions: Options = {"showNotes":true} as Options;

export function HashIdentifierToolView() {
  const [input, setInput] = useState("5f4dcc3b5aa765d61d8327deb882cf99\n$2b$12$KIXQ5yQn1oKq5jH1x5u0xOeDq3k2m1v4n6bq8w9r7t5y3u1i0o2pa\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => identifyHashes(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showNotes} onChange={(e) => setOptions((o) => ({ ...o, showNotes: e.target.checked }))} />
          Show notes
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Hashes (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="5f4dcc3b5aa765d61d8327deb882cf99"
                aria-label="Hashes (one per line)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
