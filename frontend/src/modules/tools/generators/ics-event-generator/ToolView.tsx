"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateIcs } from "./transform";
import type { IcsEventGeneratorOptions } from "./schema";

type Options = IcsEventGeneratorOptions;

const defaultOptions: Options = {"allDay":false,"alarm":"15m","repeat":"none","repeatCount":0} as Options;

export function IcsEventGeneratorToolView() {
  const [input, setInput] = useState("title: Sprint planning\nstart: 2026-11-05 10:00+05:30\nend: 2026-11-05 11:30+05:30\nlocation: Room 4\ndescription: Bring estimates, please.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateIcs(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allDay} onChange={(e) => setOptions((o) => ({ ...o, allDay: e.target.checked }))} />
          All-day
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Reminder
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.alarm}
            onChange={(e) => setOptions((o) => ({ ...o, alarm: e.target.value as Options["alarm"] }))}
          >
            <option value="none">{"None"}</option>
            <option value="5m">{"5 min before"}</option>
            <option value="15m">{"15 min before"}</option>
            <option value="1h">{"1 hour before"}</option>
            <option value="1d">{"1 day before"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Repeat
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.repeat}
            onChange={(e) => setOptions((o) => ({ ...o, repeat: e.target.value as Options["repeat"] }))}
          >
            <option value="none">{"Never"}</option>
            <option value="daily">{"Daily"}</option>
            <option value="weekly">{"Weekly"}</option>
            <option value="monthly">{"Monthly"}</option>
            <option value="yearly">{"Yearly"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Repeat count (0 = forever)
          <input
            type="number"
            min={0} max={1000}
            value={options.repeatCount}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, repeatCount: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Event(s) — key: value lines, blank line between events</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="title: Team sync\nstart: 2026-11-05 14:30\nend: 2026-11-05 15:00"
                aria-label="Event(s) — key: value lines, blank line between events"
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
