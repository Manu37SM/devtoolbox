"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { describeKeyEvent, type KeyDescription } from "./transform";

export function KeycodeInfoToolView() {
  const [info, setInfo] = useState<KeyDescription | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const rows: [string, string][] = info
    ? [
        ["event.key", info.key],
        ["event.code", info.code],
        ["event.keyCode (deprecated)", String(info.keyCode)],
        ["event.location", info.location],
        ["Modifiers", info.modifiers],
      ]
    : [];

  return (
    <div className="flex h-full flex-col gap-4">
      <div
        ref={areaRef}
        tabIndex={0}
        role="textbox"
        aria-label="Press any key to inspect it"
        onKeyDown={(e) => {
          e.preventDefault();
          setInfo(describeKeyEvent(e.nativeEvent));
        }}
        className="flex min-h-[160px] flex-col items-center justify-center rounded-md border-2 border-dashed border-border-default bg-bg-raised p-6 text-center outline-none focus:border-accent"
      >
        {info ? (
          <div className="font-mono text-4xl text-text-primary">{info.key}</div>
        ) : (
          <div className="text-text-secondary">Click here, then press any key</div>
        )}
      </div>
      {info && (
        <>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
                <div>
                  <dt className="text-xs text-text-muted">{label}</dt>
                  <dd className="font-mono text-sm text-text-primary">{value}</dd>
                </div>
                <CopyButton value={value} />
              </div>
            ))}
          </dl>
          <div className="rounded-md border border-border-subtle bg-bg-raised p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
              Handler snippet <CopyButton value={info.snippet} />
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm text-text-primary">{info.snippet}</pre>
          </div>
        </>
      )}
    </div>
  );
}
