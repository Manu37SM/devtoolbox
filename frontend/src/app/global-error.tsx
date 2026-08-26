"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";

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
