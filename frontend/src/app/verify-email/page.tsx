"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost, ApiClientError } from "@/lib/api-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("No verification token was provided.");
      return;
    }
    apiPost("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiClientError ? err.message : "This link may have expired.");
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      {status === "verifying" && <p className="text-sm text-text-secondary">Verifying…</p>}
      {status === "success" && (
        <>
          <h1 className="text-xl font-semibold text-text-primary">Email verified</h1>
          <p className="mt-2 text-sm text-text-secondary">
            <Link href="/account" className="text-accent hover:underline">
              Go to your account
            </Link>
          </p>
        </>
      )}
      {status === "error" && (
        <>
          <h1 className="text-xl font-semibold text-text-primary">Couldn&apos;t verify</h1>
          <p className="mt-2 text-sm text-danger">{error}</p>
        </>
      )}
    </div>
  );
}
