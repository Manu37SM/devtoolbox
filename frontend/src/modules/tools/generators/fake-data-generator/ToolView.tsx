"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateFakeData } from "./transform";
import type { FakeDataGeneratorOptions } from "./schema";

const RECORD_TYPES: { value: FakeDataGeneratorOptions["recordType"]; label: string }[] = [
  { value: "person", label: "Person" },
  { value: "address", label: "Address" },
  { value: "company", label: "Company" },
  { value: "product", label: "Product" },
  { value: "internet-user", label: "Internet User" },
];

export function FakeDataGeneratorToolView() {
  const [recordType, setRecordType] = useState<FakeDataGeneratorOptions["recordType"]>("person");
  const [count, setCount] = useState(10);
  const [useSeed, setUseSeed] = useState(false);
  const [seed, setSeed] = useState(42);
  const [tick, setTick] = useState(0);

  const options: FakeDataGeneratorOptions = useMemo(
    () => ({ recordType, count, seed: useSeed ? seed : undefined }),
    [recordType, count, useSeed, seed],
  );

  const result = useMemo(() => generateFakeData(options), [options, tick]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Record type
          <select
            value={recordType}
            onChange={(e) => setRecordType(e.target.value as FakeDataGeneratorOptions["recordType"])}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          >
            {RECORD_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value))))}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={useSeed} onChange={(e) => setUseSeed(e.target.checked)} />
          Seed
        </label>
        {useSeed && (
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            aria-label="Seed value"
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
          />
        )}
        <Button variant="primary" size="sm" onClick={() => setTick((t) => t + 1)}>
          Generate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane
          label={`Generated (${count})`}
          value={result.output}
          error={result.error?.message ?? null}
          placeholder="Click Generate to produce fake data records"
        />
      </div>
    </div>
  );
}
