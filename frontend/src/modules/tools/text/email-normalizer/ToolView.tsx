"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { normalizeEmails } from "./transform";
import type { EmailNormalizerOptions } from "./schema";

type Options = EmailNormalizerOptions;

const defaultOptions: Options = {"stripPlus":"gmail","lowercase":true,"gmailDots":true,"unifyGmailDomain":true,"dedupe":true} as Options;

export function EmailNormalizerToolView() {
  const [input, setInput] = useState("Ann.Lee+news@gmail.com\nannlee@gmail.com\nbob@Example.com");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => normalizeEmails(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Strip +tag
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.stripPlus}
            onChange={(e) => setOptions((o) => ({ ...o, stripPlus: e.target.value as Options["stripPlus"] }))}
          >
            <option value="none">{"Never"}</option>
            <option value="gmail">{"Gmail only"}</option>
            <option value="all">{"All domains"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lowercase} onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))} />
          Lowercase
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.gmailDots} onChange={(e) => setOptions((o) => ({ ...o, gmailDots: e.target.checked }))} />
          Remove Gmail dots
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.unifyGmailDomain} onChange={(e) => setOptions((o) => ({ ...o, unifyGmailDomain: e.target.checked }))} />
          googlemail → gmail
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          Dedupe
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="One address per line (commas and semicolons also work)"
                aria-label="Input"
                
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
