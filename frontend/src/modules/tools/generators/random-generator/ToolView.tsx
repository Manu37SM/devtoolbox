"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/CopyButton";
import { generateRandom } from "./transform";
import type { RandomGeneratorOptions } from "./schema";

type NumberOpts = Omit<Extract<RandomGeneratorOptions, { kind: "number" }>, "kind">;
type StringOpts = Omit<Extract<RandomGeneratorOptions, { kind: "string" }>, "kind">;

const field = "rounded-sm border border-border-default bg-bg-raised px-2 py-1";
const label = "flex items-center gap-1.5 text-sm text-text-secondary";
const SEPARATORS = { newline: "\n", comma: ", ", space: " ", tab: "\t", semicolon: "; " } as const;

/** Number input that tolerates an empty field while typing and never emits NaN. */
function num(value: string, fallback: number): number {
  const n = Number(value);
  return value.trim() !== "" && Number.isFinite(n) ? n : fallback;
}

export function RandomGeneratorToolView() {
  const [kind, setKind] = useState<"number" | "string">("number");
  const [numberOpts, setNumberOpts] = useState<NumberOpts>({
    min: 1, max: 100, count: 10, allowDuplicates: true, decimals: 0, sort: "none", zeroPad: false,
  });
  const [stringOpts, setStringOpts] = useState<StringOpts>({
    length: 16, count: 10, charset: "alphanumeric", customCharset: "", excludeAmbiguous: false,
    unique: false, prefix: "", suffix: "", sort: "none",
  });
  const [separator, setSeparator] = useState<keyof typeof SEPARATORS>("newline");
  // Bumped only by the Regenerate button. The result is *derived* (useMemo) from the
  // options, so it can never feed back into its own inputs and loop.
  const [seed, setSeed] = useState(0);

  const result = useMemo(
    () => generateRandom(kind === "number" ? { kind, ...numberOpts } : { kind, ...stringOpts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kind, numberOpts, stringOpts, seed],
  );
  const joined = result.values.join(SEPARATORS[separator]);

  const setN = <K extends keyof NumberOpts>(k: K, v: NumberOpts[K]) => setNumberOpts((o) => ({ ...o, [k]: v }));
  const setS = <K extends keyof StringOpts>(k: K, v: StringOpts[K]) => setStringOpts((o) => ({ ...o, [k]: v }));
  const sortSelect = (value: "none" | "asc" | "desc", on: (v: "none" | "asc" | "desc") => void) => (
    <label className={label}>
      Sort
      <select className={field} value={value} onChange={(e) => on(e.target.value as "none" | "asc" | "desc")}>
        <option value="none">As generated</option>
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </label>
  );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["number", "string"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`px-3 py-1.5 text-xs font-medium capitalize ${
                kind === k ? "bg-accent text-accent-foreground" : "text-text-secondary hover:bg-bg-raised"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        {kind === "number" ? (
          <>
            <label className={label}>
              Min
              <input type="number" value={numberOpts.min} onChange={(e) => setN("min", num(e.target.value, 0))} className={`w-24 ${field}`} />
            </label>
            <label className={label}>
              Max
              <input type="number" value={numberOpts.max} onChange={(e) => setN("max", num(e.target.value, 0))} className={`w-24 ${field}`} />
            </label>
            <label className={label}>
              Count
              <input type="number" min={1} max={1000} value={numberOpts.count} onChange={(e) => setN("count", Math.min(1000, Math.max(1, Math.round(num(e.target.value, 1)))))} className={`w-20 ${field}`} />
            </label>
            <label className={label}>
              Decimals
              <input type="number" min={0} max={10} value={numberOpts.decimals} onChange={(e) => setN("decimals", Math.min(10, Math.max(0, Math.round(num(e.target.value, 0)))))} className={`w-16 ${field}`} />
            </label>
            {sortSelect(numberOpts.sort, (v) => setN("sort", v))}
            <label className={label}>
              <input type="checkbox" checked={numberOpts.allowDuplicates} onChange={(e) => setN("allowDuplicates", e.target.checked)} />
              Allow duplicates
            </label>
            <label className={label}>
              <input type="checkbox" checked={numberOpts.zeroPad} onChange={(e) => setN("zeroPad", e.target.checked)} />
              Zero-pad
            </label>
          </>
        ) : (
          <>
            <label className={label}>
              Length
              <input type="number" min={1} max={256} value={stringOpts.length} onChange={(e) => setS("length", Math.min(256, Math.max(1, Math.round(num(e.target.value, 1)))))} className={`w-20 ${field}`} />
            </label>
            <label className={label}>
              Count
              <input type="number" min={1} max={1000} value={stringOpts.count} onChange={(e) => setS("count", Math.min(1000, Math.max(1, Math.round(num(e.target.value, 1)))))} className={`w-20 ${field}`} />
            </label>
            <label className={label}>
              Charset
              <select className={field} value={stringOpts.charset} onChange={(e) => setS("charset", e.target.value as StringOpts["charset"])}>
                <option value="alphanumeric">Alphanumeric</option>
                <option value="alpha">Letters</option>
                <option value="lower">Lowercase</option>
                <option value="upper">Uppercase</option>
                <option value="numeric">Digits</option>
                <option value="hex">Hex (lower)</option>
                <option value="hexUpper">Hex (upper)</option>
                <option value="base32">Base32</option>
                <option value="base64url">Base64url</option>
                <option value="symbols">Symbols</option>
                <option value="custom">Custom…</option>
              </select>
            </label>
            {stringOpts.charset === "custom" && (
              <label className={label}>
                Characters
                <input type="text" value={stringOpts.customCharset} onChange={(e) => setS("customCharset", e.target.value)} placeholder="abc123" className={`w-40 font-mono ${field}`} />
              </label>
            )}
            <label className={label}>
              Prefix
              <input type="text" value={stringOpts.prefix} onChange={(e) => setS("prefix", e.target.value)} className={`w-20 font-mono ${field}`} />
            </label>
            <label className={label}>
              Suffix
              <input type="text" value={stringOpts.suffix} onChange={(e) => setS("suffix", e.target.value)} className={`w-20 font-mono ${field}`} />
            </label>
            {sortSelect(stringOpts.sort, (v) => setS("sort", v))}
            <label className={label}>
              <input type="checkbox" checked={stringOpts.excludeAmbiguous} onChange={(e) => setS("excludeAmbiguous", e.target.checked)} />
              No look-alikes (0/O, 1/l/I…)
            </label>
            <label className={label}>
              <input type="checkbox" checked={stringOpts.unique} onChange={(e) => setS("unique", e.target.checked)} />
              Unique
            </label>
          </>
        )}
        <label className={label}>
          Separator
          <select className={field} value={separator} onChange={(e) => setSeparator(e.target.value as keyof typeof SEPARATORS)}>
            <option value="newline">New line</option>
            <option value="comma">Comma</option>
            <option value="space">Space</option>
            <option value="tab">Tab</option>
            <option value="semicolon">Semicolon</option>
          </select>
        </label>
        <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
          Regenerate
        </Button>
      </div>

      {result.error ? (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-text-secondary">Generated ({result.values.length})</label>
            <CopyButton value={joined} />
          </div>
          <pre className="flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
            {joined}
          </pre>
        </div>
      )}
    </div>
  );
}
