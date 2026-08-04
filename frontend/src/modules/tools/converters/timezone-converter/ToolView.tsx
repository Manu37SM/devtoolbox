"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { COMMON_TIMEZONES, convertTimezones } from "./transform";
import type { TimezoneConverterOptions } from "./schema";

function nowAsDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TimezoneConverterToolView() {
  const [datetime, setDatetime] = useState(nowAsDatetimeLocal);
  const [options, setOptions] = useState<TimezoneConverterOptions>({
    sourceTimezone: "UTC",
    targetTimezones: ["America/New_York", "Europe/London", "Asia/Tokyo"],
  });
  const [zoneToAdd, setZoneToAdd] = useState<string>(COMMON_TIMEZONES[0] as string);

  const result = useMemo(
    () => convertTimezones(datetime, options.sourceTimezone, options.targetTimezones),
    [datetime, options],
  );

  function addTimezone() {
    if (options.targetTimezones.includes(zoneToAdd)) return;
    setOptions((o) => ({ ...o, targetTimezones: [...o.targetTimezones, zoneToAdd] }));
  }

  function removeTimezone(tz: string) {
    setOptions((o) => ({ ...o, targetTimezones: o.targetTimezones.filter((t) => t !== tz) }));
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="tz-datetime" className="text-sm font-medium text-text-secondary">
            Date &amp; time
          </label>
          <input
            id="tz-datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tz-source" className="text-sm font-medium text-text-secondary">
            Source timezone
          </label>
          <select
            id="tz-source"
            value={options.sourceTimezone}
            onChange={(e) => setOptions((o) => ({ ...o, sourceTimezone: e.target.value }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result.error ? (
        <p role="alert" className="text-sm text-danger">
          {result.error.message}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {result.rows.map((row) => (
            <div
              key={row.timezone}
              className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2"
            >
              <div>
                <div className="text-xs text-text-muted">{row.timezone}</div>
                <div className="font-mono text-sm text-text-primary">{row.formatted}</div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeTimezone(row.timezone)}>
                Remove
              </Button>
            </div>
          ))}
          {result.rows.length === 0 && <p className="text-sm text-text-muted">Add a timezone below to see converted times.</p>}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="tz-add" className="text-sm font-medium text-text-secondary">
            Add timezone
          </label>
          <select
            id="tz-add"
            value={zoneToAdd}
            onChange={(e) => setZoneToAdd(e.target.value)}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1.5 text-sm"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" size="sm" onClick={addTimezone}>
          Add
        </Button>
      </div>
    </div>
  );
}
