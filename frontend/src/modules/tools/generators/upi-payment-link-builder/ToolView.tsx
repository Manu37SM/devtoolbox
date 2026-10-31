"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { upiPaymentLinkBuilder } from "./transform";
import type { UpiPaymentLinkBuilderOptions } from "./schema";

type Options = UpiPaymentLinkBuilderOptions;

const defaultOptions: Options = {"mode": "build", "payeeName": "Blue Door Cafe", "amount": "", "note": "", "reference": "", "merchantCode": "", "targets": ["upi", "qr-payload"], "androidPackage": "com.google.android.apps.nbu.paisa.user"} as Options;

export function UpiPaymentLinkBuilderToolView() {
  const [in0, setIn0] = useState("shop@okicici");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => upiPaymentLinkBuilder(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"build"}>{"Build link"}</option>
            <option value={"parse"}>{"Parse link"}</option>
          </select>
        </label>
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Payee name"}
          <input type="text" value={options.payeeName} placeholder={"Blue Door Cafe"} onChange={(e) => setOptions((o) => ({ ...o, payeeName: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Amount \u20b9"}
          <input type="text" value={options.amount} placeholder={"(optional)"} onChange={(e) => setOptions((o) => ({ ...o, amount: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Note"}
          <input type="text" value={options.note} placeholder={"Order #42"} onChange={(e) => setOptions((o) => ({ ...o, note: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Reference"}
          <input type="text" value={options.reference} placeholder={"ORD42"} onChange={(e) => setOptions((o) => ({ ...o, reference: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"MCC"}
          <input type="text" value={options.merchantCode} placeholder={"5812"} onChange={(e) => setOptions((o) => ({ ...o, merchantCode: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <fieldset className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <legend className="sr-only">{"Links"}</legend>
          <span>{"Links"}</span>
          {([["upi", "upi://"], ["qr-payload", "QR payload"], ["gpay", "GPay"], ["phonepe", "PhonePe"], ["paytm", "Paytm"], ["android-intent", "Android intent"], ["html", "HTML"]] as const).map(([v, x]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="checkbox" checked={(options.targets as string[]).includes(v)} onChange={(e) => setOptions((o) => ({ ...o, targets: (e.target.checked ? [...(o.targets as string[]), v] : (o.targets as string[]).filter((i) => i !== v)) as Options["targets"] }))} />
              {x}
            </label>
          ))}
        </fieldset>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Android package"}
          <input type="text" value={options.androidPackage} placeholder={"com.google.android.apps.nbu.paisa.user"} onChange={(e) => setOptions((o) => ({ ...o, androidPackage: e.target.value }))} className="w-72 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Payee VPA (build) or upi:// link (parse)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"shop@okicici"}
                  aria-label={"Payee VPA (build) or upi:// link (parse)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Links"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a VPA such as shop@okicici"} />}
        />
      </div>
    </div>
  );
}
