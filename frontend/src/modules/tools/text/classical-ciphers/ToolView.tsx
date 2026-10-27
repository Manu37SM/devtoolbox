"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertCipher } from "./transform";
import type { ClassicalCiphersOptions } from "./schema";

type Options = ClassicalCiphersOptions;

const defaultOptions: Options = {"cipher":"rot13","mode":"encrypt","shift":3,"key":"KEY"} as Options;

export function ClassicalCiphersToolView() {
  const [input, setInput] = useState("Hello, World!");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertCipher(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Cipher
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.cipher}
            onChange={(e) => setOptions((o) => ({ ...o, cipher: e.target.value as Options["cipher"] }))}
          >
            <option value="rot13">{"ROT13"}</option>
            <option value="caesar">{"Caesar"}</option>
            <option value="atbash">{"Atbash"}</option>
            <option value="rot47">{"ROT47"}</option>
            <option value="vigenere">{"Vigenère"}</option>
          </select>
        </label>
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["encrypt","Encrypt"],["decrypt","Decrypt"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.cipher === "caesar" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Shift
          <input
            type="number"
            min={-25} max={25}
            value={options.shift}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, shift: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.cipher === "vigenere" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Key
          <input
            type="text"
            value={options.key}
            placeholder="letters only"
            onChange={(e) => setOptions((o) => ({ ...o, key: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
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
