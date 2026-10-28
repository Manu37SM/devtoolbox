"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { buildZone } from "./transform";
import type { DnsZoneRecordBuilderOptions } from "./schema";

type Options = DnsZoneRecordBuilderOptions;

const defaultOptions: Options = {"ttl":3600,"autoDot":true,"alignColumns":true} as Options;

export function DnsZoneRecordBuilderToolView() {
  const [input, setInput] = useState("@ A 203.0.113.10\nwww CNAME example.com\n@ MX 10 mail.example.com\n@ TXT v=spf1 mx -all\n_sip._tcp SRV 10 60 5060 sip.example.com\n@ CAA 0 issue letsencrypt.org");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildZone(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Default TTL
          <input
            type="number"
            min={0} max={2147483647}
            value={options.ttl}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, ttl: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.autoDot} onChange={(e) => setOptions((o) => ({ ...o, autoDot: e.target.checked }))} />
          Add trailing dots to hostnames
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.alignColumns} onChange={(e) => setOptions((o) => ({ ...o, alignColumns: e.target.checked }))} />
          Align columns
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Records: name [ttl] TYPE value</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="www A 203.0.113.10"
                aria-label="Records: name [ttl] TYPE value"
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
