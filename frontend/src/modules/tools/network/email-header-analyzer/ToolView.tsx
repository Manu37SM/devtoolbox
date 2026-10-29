"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runEmailHeaderAnalyzer } from "./transform";
import type { EmailHeaderAnalyzerOptions } from "./schema";

type Options = EmailHeaderAnalyzerOptions;

const defaultOptions: Options = {"showAllHeaders":false} as Options;

export function EmailHeaderAnalyzerToolView() {
  const [input, setInput] = useState("Received: from mail-out.acme-bank.com (mail-out.acme-bank.com. [203.0.113.10])\n        by mx.google.com with ESMTPS id x1si;\n        Wed, 31 Jan 2024 02:02:01 -0800 (PST)\nReceived: from app01.internal ([10.0.0.5]) by mail-out.acme-bank.com with ESMTP; Wed, 31 Jan 2024 15:31:55 +0530\nAuthentication-Results: mx.google.com;\n       dkim=pass header.i=@acme-bank.com header.s=s1;\n       spf=pass smtp.mailfrom=bounce@mail.acme-bank.com;\n       dmarc=pass (p=REJECT) header.from=acme-bank.com\nReturn-Path: <bounce@mail.acme-bank.com>\nDKIM-Signature: v=1; a=rsa-sha256; d=acme-bank.com; s=s1; h=from:to:subject; bh=abc=; b=def=\nFrom: Acme Bank <alerts@acme-bank.com>\nReply-To: support@acme-help.net\nTo: ann@example.org\nSubject: Your statement\nDate: Wed, 31 Jan 2024 15:31:50 +0530\nMessage-ID: <123@acme-bank.com>");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runEmailHeaderAnalyzer(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showAllHeaders} onChange={(e) => setOptions((o) => ({ ...o, showAllHeaders: e.target.checked }))} />
          List all headers
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Raw message headers</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Received: from ..."
                aria-label="Raw message headers"
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
