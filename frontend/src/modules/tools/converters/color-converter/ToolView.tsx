"use client";

import { useMemo, useState } from "react";
import { convertColor } from "./transform";
import { colorConverterOptionsSchema, type ColorConverterOptions } from "./schema";
import { CopyButton } from "@/components/tools/CopyButton";

const CLS_LABEL = "flex items-center gap-1.5 text-sm text-text-secondary";
const CLS_SELECT = "rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-text-muted">{label}</div>
        <div className="break-all font-mono text-sm text-text-primary">{value}</div>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

export function ColorConverterToolView() {
  const [input, setInput] = useState("#4f46e5");
  const [options, setOptions] = useState<ColorConverterOptions>(() => colorConverterOptionsSchema.parse({}));
  const result = useMemo(() => convertColor(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 flex-shrink-0 rounded-md border border-border-default"
          style={{
            // Checkerboard under the colour so transparency is visible.
            backgroundImage: result.error
              ? undefined
              : `linear-gradient(${result.css}, ${result.css}), repeating-conic-gradient(#ccc 0 25%, #fff 0 50%)`,
            backgroundSize: "auto, 12px 12px",
          }}
          aria-hidden="true"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
          aria-label="Color input"
          placeholder="#4f46e5, rgb(79 70 229 / 50%), hsl(243,75%,59%), oklch(51% 0.23 277), rebeccapurple"
        />
        <input
          type="color"
          aria-label="Pick a color"
          value={result.error ? "#000000" : result.hex.slice(0, 7).toLowerCase()}
          onChange={(e) => setInput(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-sm border border-border-default bg-bg-raised"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className={CLS_LABEL}>
          CSS syntax
          <select
            className={CLS_SELECT}
            value={options.syntax}
            onChange={(e) => setOptions((o) => ({ ...o, syntax: e.target.value as ColorConverterOptions["syntax"] }))}
          >
            <option value="legacy">Legacy — rgb(1, 2, 3)</option>
            <option value="modern">Modern — rgb(1 2 3 / 50%)</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          Decimals
          <select
            className={CLS_SELECT}
            value={options.precision}
            onChange={(e) => setOptions((o) => ({ ...o, precision: Number(e.target.value) }))}
          >
            {[0, 1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className={CLS_LABEL}>
          <input
            type="checkbox"
            checked={options.uppercaseHex}
            onChange={(e) => setOptions((o) => ({ ...o, uppercaseHex: e.target.checked }))}
          />
          Uppercase hex
        </label>
      </div>
      {result.error ? (
        <p role="alert" className="text-sm text-danger">
          {result.error}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Row label="HEX" value={result.hex} />
            <Row label="RGB" value={result.rgb} />
            <Row label="HSL" value={result.hsl} />
            <Row label="HWB" value={result.hwb ?? ""} />
            <Row label="OKLCH" value={result.oklch ?? ""} />
            <Row label="HSV / HSB" value={result.hsv ?? ""} />
            <Row label="CMYK" value={result.cmyk} />
            <Row label="CSS name" value={result.name ?? ""} />
          </div>
          <h2 className="text-sm font-medium text-text-secondary">In code</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {result.code?.map((c) => <Row key={c.label} label={c.label} value={c.value} />)}
          </div>
        </>
      )}
    </div>
  );
}
