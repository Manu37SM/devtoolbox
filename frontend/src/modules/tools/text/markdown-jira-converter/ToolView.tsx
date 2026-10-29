"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runMarkdownJiraConverter } from "./transform";
import type { MarkdownJiraConverterOptions } from "./schema";

type Options = MarkdownJiraConverterOptions;

const defaultOptions: Options = {"direction":"md-to-jira"} as Options;

export function MarkdownJiraConverterToolView() {
  const [input, setInput] = useState("## Release 2.3\n\n- **Payments:** retry failed UPI callbacks\n  - backoff up to `5m`\n- [x] migrate to Java 21\n- [ ] remove legacy endpoint ~~/v1/pay~~\n\n```java\nretryTemplate.execute(ctx -> client.call());\n```\n\n| Service | Owner |\n| --- | --- |\n| orders | @ann |\n\nSee [runbook](https://wiki.acme.com/runbook).");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runMarkdownJiraConverter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="md-to-jira">{"Markdown to Jira"}</option>
            <option value="jira-to-md">{"Jira to Markdown"}</option>
            <option value="md-to-slack">{"Markdown to Slack"}</option>
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
                placeholder="# Title"
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
