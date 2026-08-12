"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

/** App Router's top-level error boundary — catches rendering errors that
 * escape every route's own error handling and reports them to Sentry
 * (AUDIT_REPORT.md §24). Only the error object itself is sent, same
 * redaction rules as sentry.client.config.ts — this component never has
 * access to a tool's input/output content anyway, since that lives in
 * per-tool component state, not anything passed to an error boundary. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-24 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
          <p className="text-sm text-text-secondary">
            This has been reported. Your tool data wasn&apos;t affected — nothing you typed leaves your browser
            unless you explicitly save or share it.
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
