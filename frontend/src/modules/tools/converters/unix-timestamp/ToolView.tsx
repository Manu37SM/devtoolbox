"use client";

import { useEffect, useMemo, useState } from "react";
import { timestampToHuman, humanToTimestamp } from "./transform";
import type { UnixTimestampUnit } from "./schema";

export function UnixTimestampToolView() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [tsInput, setTsInput] = useState(String(Math.floor(Date.now() / 1000)));
  const [unit, setUnit] = useState<UnixTimestampUnit>("seconds");
  const tsResult = useMemo(() => timestampToHuman(tsInput, unit, now), [tsInput, unit, now]);

  const [dateInput, setDateInput] = useState("");
  const dateResult = useMemo(() => humanToTimestamp(dateInput), [dateInput]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-md border border-border-subtle bg-bg-raised px-3 py-2 text-sm text-text-muted">
        Current time: <span className="font-mono text-text-primary">{Math.floor(now / 1000)}</span>{" "}
        ({new Date(now).toISOString()})
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text-secondary">Timestamp → Date</h2>
        <div className="flex items-center gap-2">
          <input
            value={tsInput}
            onChange={(e) => setTsInput(e.target.value)}
            className="w-48 rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 font-mono text-sm"
            aria-label="Unix timestamp input"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnixTimestampUnit)}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm"
          >
            <option value="seconds">seconds</option>
            <option value="milliseconds">milliseconds</option>
          </select>
        </div>
        {tsResult.error ? (
          <p role="alert" className="text-sm text-danger">{tsResult.error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            <div><span className="text-text-muted">ISO 8601: </span><span className="font-mono">{tsResult.iso}</span></div>
            <div><span className="text-text-muted">UTC: </span><span className="font-mono">{tsResult.utc}</span></div>
            <div><span className="text-text-muted">Local: </span><span className="font-mono">{tsResult.local}</span></div>
            <div><span className="text-text-muted">Relative: </span><span className="font-mono">{tsResult.relative}</span></div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text-secondary">Date → Timestamp</h2>
        <input
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          placeholder="e.g. 2026-07-30T12:00:00Z"
          className="w-80 rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 font-mono text-sm"
          aria-label="Human date input"
        />
        {dateResult.error ? (
          <p role="alert" className="text-sm text-danger">{dateResult.error}</p>
        ) : (
          <div className="flex gap-4 text-sm">
            <div><span className="text-text-muted">Seconds: </span><span className="font-mono">{dateResult.seconds}</span></div>
            <div><span className="text-text-muted">Milliseconds: </span><span className="font-mono">{dateResult.milliseconds}</span></div>
          </div>
        )}
      </section>
    </div>
  );
}
