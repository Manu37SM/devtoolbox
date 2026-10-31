"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { sequenceGenerator } from "./transform";
import type { SequenceGeneratorOptions } from "./schema";

type Options = SequenceGeneratorOptions;

const defaultOptions: Options = {"kind": "numbers", "start": 1, "end": 10, "step": 1, "count": 0, "padWidth": 0, "decimals": 0, "prefix": "", "suffix": "", "letterFrom": "a", "letterCase": "lower", "startDate": "2026-01-01", "dateStepUnit": "day", "dateFormat": "yyyy-MM-dd", "weekdaysOnly": false, "template": "item-{n:3}", "reverse": false, "shuffle": false, "seed": 0, "separator": "newline", "customSeparator": "", "quote": "none"} as Options;

export function SequenceGeneratorToolView() {

  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => sequenceGenerator("", options), [options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Type"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.kind} onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}>
            <option value={"numbers"}>{"Numbers"}</option>
            <option value={"letters"}>{"Letters (a, b \u2026 aa)"}</option>
            <option value={"dates"}>{"Dates"}</option>
            <option value={"template"}>{"Template"}</option>
          </select>
        </label>
        {["numbers", "template"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Start"}
          <input type="number" min={-1000000000} max={1000000000} step={"any"} value={options.start} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, start: Math.min(1000000000, Math.max(-1000000000, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["numbers", "letters", "template"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"End"}
          <input type="number" min={-1000000000} max={1000000000} step={"any"} value={options.end} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, end: Math.min(1000000000, Math.max(-1000000000, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Step"}
          <input type="number" min={-1000000000} max={1000000000} step={"any"} value={options.step} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, step: Math.min(1000000000, Math.max(-1000000000, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Count (0 = until end)"}
          <input type="number" min={0} max={100000} value={options.count} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: Math.min(100000, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        {["numbers", "template"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Decimals"}
          <input type="number" min={0} max={10} value={options.decimals} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, decimals: Math.min(10, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["numbers", "template"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Pad to"}
          <input type="number" min={0} max={30} value={options.padWidth} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, padWidth: Math.min(30, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["numbers", "letters", "dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Prefix"}
          <input type="text" value={options.prefix} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, prefix: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["numbers", "letters", "dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Suffix"}
          <input type="text" value={options.suffix} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, suffix: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["letters"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"From"}
          <input type="text" value={options.letterFrom} placeholder={"a"} onChange={(e) => setOptions((o) => ({ ...o, letterFrom: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["letters"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Case"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.letterCase} onChange={(e) => setOptions((o) => ({ ...o, letterCase: e.target.value as Options["letterCase"] }))}>
            <option value={"lower"}>{"lower"}</option>
            <option value={"upper"}>{"UPPER"}</option>
          </select>
        </label>
        )}
        {["dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Start date"}
          <input type="text" value={options.startDate} placeholder={"2026-01-31"} onChange={(e) => setOptions((o) => ({ ...o, startDate: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Every"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.dateStepUnit} onChange={(e) => setOptions((o) => ({ ...o, dateStepUnit: e.target.value as Options["dateStepUnit"] }))}>
            <option value={"day"}>{"day(s)"}</option>
            <option value={"week"}>{"week(s)"}</option>
            <option value={"month"}>{"month(s)"}</option>
            <option value={"quarter"}>{"quarter(s)"}</option>
            <option value={"year"}>{"year(s)"}</option>
          </select>
        </label>
        )}
        {["dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <input type="text" value={options.dateFormat} placeholder={"yyyy-MM-dd"} onChange={(e) => setOptions((o) => ({ ...o, dateFormat: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["dates"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.weekdaysOnly} onChange={(e) => setOptions((o) => ({ ...o, weekdaysOnly: e.target.checked }))} />
          {"Weekdays only"}
        </label>
        )}
        {["template"].includes(String(options.kind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Template"}
          <input type="text" value={options.template} placeholder={"user_{n:3}@{a}.test"} onChange={(e) => setOptions((o) => ({ ...o, template: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.reverse} onChange={(e) => setOptions((o) => ({ ...o, reverse: e.target.checked }))} />
          {"Reverse"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.shuffle} onChange={(e) => setOptions((o) => ({ ...o, shuffle: e.target.checked }))} />
          {"Shuffle"}
        </label>
        {["true"].includes(String(options.shuffle)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Seed (0 = random)"}
          <input type="number" min={0} max={2147483647} value={options.seed} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, seed: Math.min(2147483647, Math.max(0, n)) })); }} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Separator"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.separator} onChange={(e) => setOptions((o) => ({ ...o, separator: e.target.value as Options["separator"] }))}>
            <option value={"newline"}>{"New line"}</option>
            <option value={"comma"}>{"Comma"}</option>
            <option value={"comma-space"}>{"Comma + space"}</option>
            <option value={"space"}>{"Space"}</option>
            <option value={"tab"}>{"Tab"}</option>
            <option value={"semicolon"}>{"Semicolon"}</option>
            <option value={"pipe"}>{"Pipe"}</option>
            <option value={"custom"}>{"Custom\u2026"}</option>
          </select>
        </label>
        {["custom"].includes(String(options.separator)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Joiner"}
          <input type="text" value={options.customSeparator} placeholder={" + "} onChange={(e) => setOptions((o) => ({ ...o, customSeparator: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Quote"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.quote} onChange={(e) => setOptions((o) => ({ ...o, quote: e.target.value as Options["quote"] }))}>
            <option value={"none"}>{"None"}</option>
            <option value={"single"}>{"'single'"}</option>
            <option value={"double"}>{"\"double\""}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label={"Sequence"} fileName={"sequence.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Nothing to show"} />
      </div>
    </div>
  );
}
