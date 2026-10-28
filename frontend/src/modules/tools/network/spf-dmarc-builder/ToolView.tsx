"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSpfDmarc } from "./transform";
import type { SpfDmarcBuilderOptions } from "./schema";

type Options = SpfDmarcBuilderOptions;

const defaultOptions: Options = {"record":"spf","spfAll":"~all","dmarcPolicy":"none","dmarcPct":100} as Options;

export function SpfDmarcBuilderToolView() {
  const [input, setInput] = useState("include:_spf.google.com\ninclude:spf.protection.outlook.com\nip4:203.0.113.0/24\nmx");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSpfDmarc(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Record
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.record}
            onChange={(e) => setOptions((o) => ({ ...o, record: e.target.value as Options["record"] }))}
          >
            <option value="spf">{"SPF"}</option>
            <option value="dmarc">{"DMARC"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          SPF default
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.spfAll}
            onChange={(e) => setOptions((o) => ({ ...o, spfAll: e.target.value as Options["spfAll"] }))}
          >
            <option value="-all">{"-all (fail)"}</option>
            <option value="~all">{"~all (softfail)"}</option>
            <option value="?all">{"?all (neutral)"}</option>
            <option value="+all">{"+all (allow all)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          DMARC policy
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dmarcPolicy}
            onChange={(e) => setOptions((o) => ({ ...o, dmarcPolicy: e.target.value as Options["dmarcPolicy"] }))}
          >
            <option value="none">{"none"}</option>
            <option value="quarantine">{"quarantine"}</option>
            <option value="reject">{"reject"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          DMARC pct
          <input
            type="number"
            min={0} max={100}
            value={options.dmarcPct}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, dmarcPct: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">SPF: one mechanism per line. DMARC: key=value per line (rua, ruf, sp, adkim, aspf, fo)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"include:_spf.google.com\nip4:203.0.113.0/24"}
                aria-label="SPF: one mechanism per line. DMARC: key=value per line (rua, ruf, sp, adkim, aspf, fo)"
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
