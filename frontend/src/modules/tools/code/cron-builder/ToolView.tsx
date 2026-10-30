"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { parseCron } from "./transform";
import type { CronBuilderOptions } from "./schema";
import { CopyValue, ResultActions } from "@/components/tools/ResultActions";

const EXAMPLES: Record<CronBuilderOptions["dialect"], string> = {
  unix: "*/15 9-17 * * 1-5",
  spring: "0 0 9-17 * * MON-FRI",
  quartz: "0 15 10 ? * 6L",
};

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

function usageSnippet(expr: string, o: CronBuilderOptions, zone: string): string {
  if (o.dialect === "spring") return `@Scheduled(cron = "${expr}", zone = "${zone}")`;
  if (o.dialect === "quartz") return `CronScheduleBuilder.cronSchedule("${expr}").inTimeZone(TimeZone.getTimeZone("${zone}"))`;
  return `# Kubernetes CronJob (timeZone needs Kubernetes 1.27+)\nspec:\n  schedule: "${expr}"\n  timeZone: "${zone}"`;
}

const noopSubscribe = () => () => {};

export function CronBuilderToolView() {
  // The server renders UTC; the browser fills in the viewer's zone without a hydration mismatch.
  const localZone = useSyncExternalStore(noopSubscribe, browserZone, () => "UTC");
  const [input, setInput] = useState(EXAMPLES.unix);
  const [options, setOptions] = useState<CronBuilderOptions>({ nextRunCount: 5, dialect: "unix", timezone: "" });
  const zone = options.timezone.trim() || localZone;
  const result = useMemo(
    () => parseCron(input, { dialect: options.dialect, nextRunCount: options.nextRunCount, timezone: zone }),
    [input, options.dialect, options.nextRunCount, zone],
  );
  const snippet = usageSnippet(input.trim(), options, zone);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Dialect
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dialect}
            onChange={(e) => {
              const dialect = e.target.value as CronBuilderOptions["dialect"];
              setOptions((o) => ({ ...o, dialect }));
              // Swap in an example when the current text is another dialect's example.
              if (Object.values(EXAMPLES).includes(input.trim())) setInput(EXAMPLES[dialect]);
            }}
          >
            <option value="unix">Unix crontab (5 fields)</option>
            <option value="spring">Spring @Scheduled (6 fields)</option>
            <option value="quartz">Quartz (6-7 fields)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Time zone
          <input
            list="cron-zones"
            value={options.timezone}
            placeholder={localZone}
            onChange={(e) => setOptions((o) => ({ ...o, timezone: e.target.value }))}
            className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
          <datalist id="cron-zones">
            {ZONES.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Show
          <input
            type="number"
            min={1}
            max={20}
            value={options.nextRunCount}
            onChange={(e) => setOptions((o) => ({ ...o, nextRunCount: Math.min(20, Math.max(1, Number(e.target.value) || 1)) }))}
            className="w-14 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
          runs
        </label>
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full max-w-md rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
        aria-label="Cron expression"
        placeholder={EXAMPLES[options.dialect]}
      />
      {result.error ? (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      ) : result.description ? (
        <>
          <p className="text-sm text-text-primary">{result.description}</p>
          <div>
            <h2 className="mb-1 text-sm font-medium text-text-secondary">
              Next {result.nextRuns.length} runs ({zone})
            </h2>
            <ul className="flex flex-col gap-1 font-mono text-sm">
              {result.nextRunsLocal.map((run, i) => (
                <li key={result.nextRuns[i]} className="rounded-sm border border-border-subtle bg-bg-raised px-2 py-1">
                  {run}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-1 flex items-center gap-1 text-sm font-medium text-text-secondary">
              Use it
              <CopyValue value={snippet} label="usage snippet" />
            </h2>
            <pre className="overflow-x-auto rounded-sm border border-border-subtle bg-bg-raised px-2 py-1 font-mono text-xs text-text-primary">{snippet}</pre>
          </div>
          <ResultActions
            text={`${input.trim()}\n${result.description}\n\nNext runs (${zone}):\n${result.nextRunsLocal.join("\n")}`}
            json={{ expression: input.trim(), dialect: options.dialect, timeZone: zone, description: result.description, nextRunsUtc: result.nextRuns }}
            className="justify-start"
          />
        </>
      ) : (
        <p className="text-sm text-text-muted">Enter a cron expression above.</p>
      )}
    </div>
  );
}
