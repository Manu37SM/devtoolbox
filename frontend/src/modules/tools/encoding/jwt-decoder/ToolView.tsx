"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { DualPane } from "@/components/tools/DualPane";
import { Badge } from "@/components/ui/badge";
import { decodeJwt } from "./transform";

export function JwtDecoderToolView() {
  const [input, setInput] = useState("");
  const result = useMemo(() => decodeJwt(input), [input]);

  return (
    <div className="min-h-0 flex-1">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Token</label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="eyJhbGciOi..."
              aria-label="JWT input"
            />
          </div>
        }
        output={
          <div className="flex h-full flex-col gap-3 overflow-auto">
            {result.error ? (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                {result.error}
              </div>
            ) : result.header ? (
              <>
                {result.isExpired !== null && (
                  <Badge variant={result.isExpired ? "danger" : "success"} className="w-fit">
                    {result.isExpired ? "Expired" : "Valid (not expired)"}
                  </Badge>
                )}
                <section>
                  <h2 className="mb-1 text-sm font-medium text-text-secondary">Header</h2>
                  <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
                    {JSON.stringify(result.header, null, 2)}
                  </pre>
                </section>
                <section>
                  <h2 className="mb-1 text-sm font-medium text-text-secondary">Payload</h2>
                  <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
                    {JSON.stringify(result.payload, null, 2)}
                  </pre>
                </section>
                <section>
                  <h2 className="mb-1 text-sm font-medium text-text-secondary">Signature</h2>
                  <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-xs break-all">
                    {result.signature}
                  </pre>
                </section>
              </>
            ) : (
              <p className="text-sm text-text-muted">Paste a JWT to decode it.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
