"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runVlsmSubnetPlanner } from "./transform";
import type { VlsmSubnetPlannerOptions } from "./schema";

type Options = VlsmSubnetPlannerOptions;

const defaultOptions: Options = {"platform":"standard","order":"largest-first"} as Options;

export function VlsmSubnetPlannerToolView() {
  const [input, setInput] = useState("10.20.0.0/22\napp-private 400\ndb-private 60\npublic-lb 25\nmgmt 10");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runVlsmSubnetPlanner(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Platform
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.platform}
            onChange={(e) => setOptions((o) => ({ ...o, platform: e.target.value as Options["platform"] }))}
          >
            <option value="standard">{"Standard (2 reserved)"}</option>
            <option value="aws">{"AWS (5 reserved)"}</option>
            <option value="azure">{"Azure (5 reserved)"}</option>
            <option value="gcp">{"GCP (4 reserved)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Order
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.order}
            onChange={(e) => setOptions((o) => ({ ...o, order: e.target.value as Options["order"] }))}
          >
            <option value="largest-first">{"Largest first"}</option>
            <option value="input">{"As listed"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Parent network, then one subnet per line: name hosts</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"10.0.0.0/22\nApp 200"}
                aria-label="Parent network, then one subnet per line: name hosts"
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
