"use client";

import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateMockApiResponse } from "./transform";
import type { MockApiResponseOptions, MockField, MockFieldType } from "./schema";

const FIELD_TYPES: MockFieldType[] = [
  "uuid", "name", "email", "phone", "boolean", "int", "float", "date", "sentence", "word", "url", "company", "city", "country",
];

const defaultOptions: MockApiResponseOptions = {
  fields: [
    { name: "id", type: "uuid" },
    { name: "name", type: "name" },
    { name: "email", type: "email" },
  ],
  count: 5,
  wrapInDataKey: false,
};

export function MockApiResponseGeneratorToolView() {
  const [options, setOptions] = useState<MockApiResponseOptions>(defaultOptions);
  const patch = (p: Partial<MockApiResponseOptions>) => setOptions((o) => ({ ...o, ...p }));

  const result = useMemo(() => generateMockApiResponse(options), [options]);

  const updateField = (index: number, patchField: Partial<MockField>) => {
    setOptions((o) => ({
      ...o,
      fields: o.fields.map((f, i) => (i === index ? { ...f, ...patchField } : f)),
    }));
  };

  const addField = () => {
    setOptions((o) => ({ ...o, fields: [...o.fields, { name: `field${o.fields.length + 1}`, type: "word" }] }));
  };

  const removeField = (index: number) => {
    setOptions((o) => (o.fields.length <= 1 ? o : { ...o, fields: o.fields.filter((_, i) => i !== index) }));
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Record count
          <input
            type="number"
            min={1}
            max={500}
            value={options.count}
            onChange={(e) => patch({ count: Number(e.target.value) })}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
            aria-label="Record count"
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.wrapInDataKey}
            onChange={(e) => patch({ wrapInDataKey: e.target.checked })}
          />
          Wrap in <code className="font-mono text-xs">{`{ "data": [...] }`}</code>
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Fields</span>
          <Button variant="ghost" size="sm" onClick={addField}>
            <Plus className="h-3.5 w-3.5" />
            Add field
          </Button>
        </div>
        {options.fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={field.name}
              onChange={(e) => updateField(i, { name: e.target.value })}
              className="w-40 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
              aria-label={`Field ${i + 1} name`}
            />
            <select
              value={field.type}
              onChange={(e) => updateField(i, { type: e.target.value as MockFieldType })}
              className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm"
              aria-label={`Field ${i + 1} type`}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeField(i)}
              disabled={options.fields.length <= 1}
              aria-label={`Remove field ${i + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="min-h-[200px] flex-1">
        <OutputPane
          value={result.output}
          error={result.error?.message ?? null}
          label="Generated JSON"
          placeholder="Generated mock API response will appear here"
        />
      </div>
    </div>
  );
}
