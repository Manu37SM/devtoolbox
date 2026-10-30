"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { timestampToHuman, humanToTimestamp } from "./transform";
import type { UnixTimestampUnit } from "./schema";
import { CopyValue } from "@/components/tools/ResultActions";

const ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
];

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const noopSubscribe = () => () => {};

function subscribeClock(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}
// Whole seconds, so repeated reads within one render return the same snapshot.
const clockSnapshot = () => Math.floor(Date.now() / 1000) * 1000;

const UNIT_LABELS: Record<string, string> = {
  seconds: "s",
  milliseconds: "ms",
  microseconds: "µs",
  nanoseconds: "ns",
};

export function UnixTimestampToolView() {
  // Server renders UTC; the browser fills in the viewer's zone without a hydration mismatch.
  const localZone = useSyncExternalStore(noopSubscribe, browserZone, () => "UTC");
  const [zoneInput, setZoneInput] = useState("");
  const zone = zoneInput.trim() || localZone;
  // Ticking clock read through an external store: the server snapshot is 0, so the
  // prerendered HTML never contains a time that is stale by the time it hydrates.
  const now = useSyncExternalStore(subscribeClock, clockSnapshot, () => 0);

  // null = follow the current time until the user types their own value.
  const [ownTsInput, setTsInput] = useState<string | null>(null);
  const tsInput = ownTsInput ?? (now ? String(Math.floor(now / 1000)) : "");
  const [unit, setUnit] = useState<UnixTimestampUnit>("seconds");
  const tsResult = useMemo(() => timestampToHuman(tsInput, unit, now, zone), [tsInput, unit, now, zone]);

  const [dateInput, setDateInput] = useState("");
  const dateResult = useMemo(() => humanToTimestamp(dateInput), [dateInput]);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-md border border-border-subtle bg-bg-raised px-3 py-2 text-sm text-text-muted">
        Current time: <span className="font-mono text-text-primary">{now ? Math.floor(now / 1000) : "…"}</span>{" "}
        <CopyValue value={String(Math.floor(now / 1000))} label="current Unix time" className="align-middle" />{" "}
        {now ? `(${new Date(now).toISOString()})` : ""}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text-secondary">Timestamp → Date</h2>
        <div className="flex flex-wrap items-center gap-2">
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
            <option value="auto">auto-detect</option>
            <option value="seconds">seconds</option>
            <option value="milliseconds">milliseconds</option>
            <option value="microseconds">microseconds (µs)</option>
            <option value="nanoseconds">nanoseconds (ns)</option>
          </select>
          {unit === "auto" && tsResult.unit && (
            <span className="text-xs text-text-muted">read as {tsResult.unit}</span>
          )}
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Time zone
            <input
              list="unix-ts-zones"
              value={zoneInput}
              placeholder={localZone}
              onChange={(e) => setZoneInput(e.target.value)}
              className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
              aria-label="Display time zone"
            />
            <datalist id="unix-ts-zones">
              {ZONES.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
        </div>
        {tsResult.error ? (
          <p role="alert" className="text-sm text-danger">{tsResult.error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-1"><span className="text-text-muted">ISO 8601: </span><span className="font-mono">{tsResult.iso}</span><CopyValue value={String(tsResult.iso)} label="ISO 8601" /></div>
            <div className="flex items-center gap-1"><span className="text-text-muted">UTC: </span><span className="font-mono">{tsResult.utc}</span><CopyValue value={String(tsResult.utc)} label="UTC" /></div>
            <div className="flex items-center gap-1"><span className="text-text-muted">{zone}: </span><span className="font-mono">{tsResult.zoned}</span><CopyValue value={String(tsResult.zoned)} label={zone} /></div>
            <div className="flex items-center gap-1"><span className="text-text-muted">Local: </span><span className="font-mono">{tsResult.local}</span><CopyValue value={String(tsResult.local)} label="Local" /></div>
            <div className="flex items-center gap-1"><span className="text-text-muted">Relative: </span><span className="font-mono">{tsResult.relative}</span><CopyValue value={String(tsResult.relative)} label="Relative" /></div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-text-secondary">Date → Timestamp</h2>
        <input
          value={dateInput}
          onChange={(e) => setDateInput(e.target.value)}
          placeholder="e.g. 2026-07-30T12:00:00.123456789Z"
          className="w-80 rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 font-mono text-sm"
          aria-label="Human date input"
        />
        {dateResult.error ? (
          <p role="alert" className="text-sm text-danger">{dateResult.error}</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {(["seconds", "milliseconds", "microseconds", "nanoseconds"] as const).map((k) => (
              <div key={k} className="flex items-center gap-1">
                <span className="text-text-muted">{k[0]!.toUpperCase() + k.slice(1)} ({UNIT_LABELS[k]}): </span>
                <span className="font-mono">{dateResult[k]}</span>
                <CopyValue value={String(dateResult[k])} label={k} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
