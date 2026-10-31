"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { smpteTimecodeConverter } from "./transform";
import type { SmpteTimecodeConverterOptions } from "./schema";

type Options = SmpteTimecodeConverterOptions;

const defaultOptions: Options = {"fps": "29.97", "dropFrame": true, "mode": "convert", "targetFps": "25", "retimeMethod": "time", "startTc": "00:00:00:00", "output": "table"} as Options;

export function SmpteTimecodeConverterToolView() {
  const [in0, setIn0] = useState("01:00:00;00\n00:01:00;02\n1800");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => smpteTimecodeConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"convert"}>{"Convert"}</option>
            <option value={"sum"}>{"Add durations"}</option>
            <option value={"difference"}>{"Subtract (first \u2212 rest)"}</option>
            <option value={"retime"}>{"Retime to another fps"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Frame rate"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.fps} onChange={(e) => setOptions((o) => ({ ...o, fps: e.target.value as Options["fps"] }))}>
            <option value={"23.976"}>{"23.976 fps"}</option>
            <option value={"24"}>{"24 fps"}</option>
            <option value={"25"}>{"25 fps"}</option>
            <option value={"29.97"}>{"29.97 fps"}</option>
            <option value={"30"}>{"30 fps"}</option>
            <option value={"47.952"}>{"47.952 fps"}</option>
            <option value={"48"}>{"48 fps"}</option>
            <option value={"50"}>{"50 fps"}</option>
            <option value={"59.94"}>{"59.94 fps"}</option>
            <option value={"60"}>{"60 fps"}</option>
          </select>
        </label>
        {["retime"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Target rate"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.targetFps} onChange={(e) => setOptions((o) => ({ ...o, targetFps: e.target.value as Options["targetFps"] }))}>
            <option value={"23.976"}>{"23.976 fps"}</option>
            <option value={"24"}>{"24 fps"}</option>
            <option value={"25"}>{"25 fps"}</option>
            <option value={"29.97"}>{"29.97 fps"}</option>
            <option value={"30"}>{"30 fps"}</option>
            <option value={"47.952"}>{"47.952 fps"}</option>
            <option value={"48"}>{"48 fps"}</option>
            <option value={"50"}>{"50 fps"}</option>
            <option value={"59.94"}>{"59.94 fps"}</option>
            <option value={"60"}>{"60 fps"}</option>
          </select>
        </label>
        )}
        {["retime"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Keep"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.retimeMethod} onChange={(e) => setOptions((o) => ({ ...o, retimeMethod: e.target.value as Options["retimeMethod"] }))}>
            <option value={"time"}>{"Same real time"}</option>
            <option value={"frames"}>{"Same frames (speed change)"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dropFrame} onChange={(e) => setOptions((o) => ({ ...o, dropFrame: e.target.checked }))} />
          {"Drop-frame (29.97 / 59.94)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Start timecode"}
          <input type="text" value={options.startTc} placeholder={"01:00:00:00"} onChange={(e) => setOptions((o) => ({ ...o, startTc: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        {["convert", "sum", "difference"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"table"}>{"All formats"}</option>
            <option value={"timecode"}>{"Timecode"}</option>
            <option value={"frames"}>{"Frames"}</option>
            <option value={"seconds"}>{"Seconds"}</option>
            <option value={"clock"}>{"Clock time"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Values (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"01:00:00;00 \u00b7 107892 \u00b7 3599.9964s \u00b7 00:59:59.996"}
                  aria-label={"Values (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"timecode.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Converted values appear here"} />}
        />
      </div>
    </div>
  );
}
