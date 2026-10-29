"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runLegacyTextEncodings } from "./transform";
import type { LegacyTextEncodingsOptions } from "./schema";

type Options = LegacyTextEncodingsOptions;

const defaultOptions: Options = {"encoding":"quoted-printable","direction":"decode"} as Options;

export function LegacyTextEncodingsToolView() {
  const [input, setInput] = useState("Your statement for January is ready. Balance: =E2=82=B91,25,000 =3D unchanged=\n since last month.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runLegacyTextEncodings(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Encoding
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.encoding}
            onChange={(e) => setOptions((o) => ({ ...o, encoding: e.target.value as Options["encoding"] }))}
          >
            <option value="quoted-printable">{"Quoted-Printable"}</option>
            <option value="ascii85">{"Ascii85"}</option>
            <option value="z85">{"Z85"}</option>
            <option value="base45">{"Base45"}</option>
            <option value="uuencode">{"UUencode"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="decode">{"Decode"}</option>
            <option value="encode">{"Encode"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Caf=C3=A9"
                aria-label="Text"
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
