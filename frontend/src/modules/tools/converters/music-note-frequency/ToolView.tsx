"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { convertNotes } from "./transform";
import type { MusicNoteFrequencyOptions } from "./schema";

type Options = MusicNoteFrequencyOptions;

const defaultOptions: Options = {"a4":440,"accidentals":"sharp","speedOfSound":true} as Options;

export function MusicNoteFrequencyToolView() {
  const [input, setInput] = useState("A4\nC#3\n261.63 Hz\n450 Hz\nmidi 60");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertNotes(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          A4 (Hz)
          <input
            type="number"
            min={380} max={480}
            value={options.a4}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, a4: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Accidentals
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.accidentals}
            onChange={(e) => setOptions((o) => ({ ...o, accidentals: e.target.value as Options["accidentals"] }))}
          >
            <option value="sharp">{"Sharps (C#)"}</option>
            <option value="flat">{"Flats (Db)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.speedOfSound} onChange={(e) => setOptions((o) => ({ ...o, speedOfSound: e.target.checked }))} />
          Show wavelength
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Notes, frequencies or MIDI numbers (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"A4\n261.63 Hz\nmidi 60"}
                aria-label="Notes, frequencies or MIDI numbers (one per line)"
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
