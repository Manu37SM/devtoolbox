"use client";

import { useEffect, useMemo, useState } from "react";
import { parseUserAgentStructured } from "./transform";
import { ToolInput } from "@/components/tools/ToolInput";
import { CopyValue, ResultActions, toLines } from "@/components/tools/ResultActions";

interface Section {
  title: string;
  rows: [string, string | undefined][];
}

function buildSections(uaString: string): Section[] {
  if (!uaString.trim()) return [];
  const result = parseUserAgentStructured(uaString);

  const sections: Section[] = [
    {
      title: "Browser",
      rows: [
        ["Name", result.browser.name],
        ["Version", result.browser.version],
        ["Major", result.browser.major],
        ["Type", result.browser.type],
      ],
    },
    {
      title: "Operating System",
      rows: [
        ["Name", result.os.name],
        ["Version", result.os.version],
      ],
    },
    {
      title: "Device",
      rows: [
        ["Vendor", result.device.vendor],
        ["Model", result.device.model],
        ["Type", result.device.type],
      ],
    },
    {
      title: "Engine",
      rows: [
        ["Name", result.engine.name],
        ["Version", result.engine.version],
      ],
    },
    {
      title: "CPU",
      rows: [["Architecture", result.cpu.architecture]],
    },
  ];

  return sections
    .map((section) => ({ ...section, rows: section.rows.filter(([, value]) => Boolean(value)) }))
    .filter((section) => section.rows.length > 0);
}

export function UserAgentParserToolView() {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInput(window.navigator.userAgent);
    }
  }, []);

  const sections = useMemo(() => buildSections(input), [input]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">User-Agent string</label>
        <ToolInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="User-Agent string"
          placeholder="Paste a User-Agent string, e.g. Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
          className="h-24"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {sections.length === 0 ? (
          <p className="text-sm text-text-secondary">Enter a User-Agent string above to see parsed details.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <ResultActions
              text={sections.map((section) => `${section.title}\n${toLines(section.rows)}`).join("\n\n")}
              json={Object.fromEntries(sections.map((section) => [section.title, Object.fromEntries(section.rows)]))}
            />
            {sections.map((section) => (
              <div key={section.title} className="rounded-md border border-border-default">
                <div className="border-b border-border-default bg-bg-raised px-3 py-1.5 text-sm font-medium text-text-primary">
                  {section.title}
                </div>
                <div className="divide-y divide-border-default">
                  {section.rows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                      <span className="text-text-secondary">{label}</span>
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-mono text-text-primary">{value}</span>
                        <CopyValue value={String(value ?? "")} label={`${section.title} ${label}`} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
