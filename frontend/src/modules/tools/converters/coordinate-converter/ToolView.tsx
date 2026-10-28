"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { convertCoordinates } from "./transform";
import type { CoordinateConverterOptions } from "./schema";

type Options = CoordinateConverterOptions;

const defaultOptions: Options = {"precision":5,"geohashLength":9,"showUtm":true} as Options;

export function CoordinateConverterToolView() {
  const [input, setInput] = useState("48.8584, 2.2945\n40°42'46\"N 74°00'22\"W\n-33.8688 151.2093");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertCoordinates(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Precision
          <input
            type="number"
            min={0} max={10}
            value={options.precision}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, precision: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Geohash length
          <input
            type="number"
            min={1} max={12}
            value={options.geohashLength}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, geohashLength: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showUtm} onChange={(e) => setOptions((o) => ({ ...o, showUtm: e.target.checked }))} />
          Show UTM
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Coordinates (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="48.8584, 2.2945"
                aria-label="Coordinates (one per line)"
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
