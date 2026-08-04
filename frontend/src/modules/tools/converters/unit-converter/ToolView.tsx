"use client";

import { useMemo, useState } from "react";
import { convertUnit, getUnitsForCategory } from "./transform";
import type { UnitConverterOptions } from "./schema";

const CATEGORIES: { value: UnitConverterOptions["category"]; label: string }[] = [
  { value: "data", label: "Data size" },
  { value: "time", label: "Time" },
  { value: "length", label: "Length" },
  { value: "weight", label: "Weight" },
];

export function UnitConverterToolView() {
  const [value, setValue] = useState("1");
  const [options, setOptions] = useState<UnitConverterOptions>({
    category: "data",
    fromUnit: "MB",
    toUnit: "GB",
    dataBase: "1024",
  });

  const units = useMemo(() => getUnitsForCategory(options.category, options.dataBase), [options.category, options.dataBase]);
  const numericValue = value.trim() === "" ? NaN : Number(value);
  const result = useMemo(() => convertUnit(numericValue, options), [numericValue, options]);

  function changeCategory(category: UnitConverterOptions["category"]) {
    const newUnits = getUnitsForCategory(category, options.dataBase);
    setOptions((o) => ({
      ...o,
      category,
      fromUnit: newUnits[0]?.id ?? "",
      toUnit: newUnits[1]?.id ?? newUnits[0]?.id ?? "",
    }));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="unit-value" className="text-sm font-medium text-text-secondary">
            Value
          </label>
          <input
            id="unit-value"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="unit-category" className="text-sm font-medium text-text-secondary">
            Category
          </label>
          <select
            id="unit-category"
            value={options.category}
            onChange={(e) => changeCategory(e.target.value as UnitConverterOptions["category"])}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="unit-from" className="text-sm font-medium text-text-secondary">
            From
          </label>
          <select
            id="unit-from"
            value={options.fromUnit}
            onChange={(e) => setOptions((o) => ({ ...o, fromUnit: e.target.value }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="unit-to" className="text-sm font-medium text-text-secondary">
            To
          </label>
          <select
            id="unit-to"
            value={options.toUnit}
            onChange={(e) => setOptions((o) => ({ ...o, toUnit: e.target.value }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.id}
              </option>
            ))}
          </select>
        </div>
        {options.category === "data" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="unit-data-base" className="text-sm font-medium text-text-secondary">
              Base
            </label>
            <select
              id="unit-data-base"
              value={options.dataBase}
              onChange={(e) => setOptions((o) => ({ ...o, dataBase: e.target.value as UnitConverterOptions["dataBase"] }))}
              className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
            >
              <option value="1024">1024 (binary)</option>
              <option value="1000">1000 (decimal)</option>
            </select>
          </div>
        )}
      </div>

      {result.error ? (
        <p role="alert" className="text-sm text-danger">
          {result.error.message}
        </p>
      ) : (
        <div className="font-mono text-2xl text-text-primary">
          {value} {options.fromUnit} = {result.result} {options.toUnit}
        </div>
      )}

      {result.allUnits.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">All units</span>
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {result.allUnits.map((u) => (
              <div
                key={u.unit}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-1.5"
              >
                <span className="text-text-muted">{u.label}</span>
                <span className="font-mono text-text-primary">{u.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
