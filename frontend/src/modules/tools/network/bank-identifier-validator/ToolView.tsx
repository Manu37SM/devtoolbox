"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { bankIdentifierValidator } from "./transform";
import type { BankIdentifierValidatorOptions } from "./schema";

type Options = BankIdentifierValidatorOptions;

const defaultOptions: Options = {"type": "auto", "showDetails": true} as Options;

export function BankIdentifierValidatorToolView() {
  const [in0, setIn0] = useState("DEUTDEFF\n021000021\n20-00-00\nHDFC0000001");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => bankIdentifierValidator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Type"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.type} onChange={(e) => setOptions((o) => ({ ...o, type: e.target.value as Options["type"] }))}>
            <option value={"auto"}>{"Auto-detect"}</option>
            <option value={"bic"}>{"SWIFT / BIC"}</option>
            <option value={"aba"}>{"US ABA routing"}</option>
            <option value={"sortcode"}>{"UK sort code"}</option>
            <option value={"ifsc"}>{"India IFSC"}</option>
            <option value={"bsb"}>{"Australia BSB"}</option>
            <option value={"ca-transit"}>{"Canada transit"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showDetails} onChange={(e) => setOptions((o) => ({ ...o, showDetails: e.target.checked }))} />
          {"Show breakdown"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Identifiers (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"DEUTDEFF\n021000021\n20-00-00\nHDFC0000001"}
                  aria-label={"Identifiers (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Validation"} fileName={"bank-ids.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a BIC, routing number, sort code or IFSC"} />}
        />
      </div>
    </div>
  );
}
