"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runThreadDumpAnalyzer } from "./transform";
import type { ThreadDumpAnalyzerOptions } from "./schema";

type Options = ThreadDumpAnalyzerOptions;

const defaultOptions: Options = {"format":"report","stackDepth":5,"hideJvmThreads":true} as Options;

export function ThreadDumpAnalyzerToolView() {
  const [input, setInput] = useState("\"worker-1\" #21 prio=5 os_prio=0 tid=0x01 nid=0x10 waiting for monitor entry  [0x00007]\n   java.lang.Thread.State: BLOCKED (on object monitor)\n\tat com.acme.Bank.transfer(Bank.java:42)\n\t- waiting to lock <0x000000071a> (a java.lang.Object)\n\t- locked <0x000000071b> (a java.lang.Object)\n\n\"worker-2\" #22 prio=5 os_prio=0 tid=0x02 nid=0x11 waiting for monitor entry  [0x00008]\n   java.lang.Thread.State: BLOCKED (on object monitor)\n\tat com.acme.Bank.transfer(Bank.java:42)\n\t- waiting to lock <0x000000071b> (a java.lang.Object)\n\t- locked <0x000000071a> (a java.lang.Object)\n\n\"http-nio-8080-exec-1\" #30 daemon prio=5 tid=0x03 nid=0x12 runnable\n   java.lang.Thread.State: RUNNABLE\n\tat java.net.SocketInputStream.socketRead0(Native Method)\n\tat com.acme.client.PaymentClient.call(PaymentClient.java:88)");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runThreadDumpAnalyzer(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="report">{"Report"}</option>
            <option value="json">{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Group by top frames
          <input
            type="number"
            min={1} max={30}
            value={options.stackDepth}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, stackDepth: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hideJvmThreads} onChange={(e) => setOptions((o) => ({ ...o, hideJvmThreads: e.target.checked }))} />
          Hide JVM-internal threads
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Thread dump</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"\"main\" #1 prio=5 ..."}
                aria-label="Thread dump"
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
