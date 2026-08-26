"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AcceptOrganizationInviteResult } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

interface InviteAcceptPageProps {
  params: Promise<{ token: string }>;
}

export default function InviteAcceptPage({ params }: InviteAcceptPageProps) {
  const { token } = use(params);
  const router = useRouter();
  const { status } = useAuthStore();

  const [result, setResult] = useState<AcceptOrganizationInviteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || attempted) return;
    setAttempted(true);
    setAccepting(true);
    apiPost<AcceptOrganizationInviteResult>(`/organizations/invites/${token}/accept`, {}, { authenticated: true })
      .then(setResult)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Couldn't accept this invite. Please try again."))
      .finally(() => setAccepting(false));
  }, [status, token, attempted]);

  const nextParam = encodeURIComponent(`/invites/${token}`);

  if (status === "loading") {
    return <div className="mx-auto max-w-sm px-4 py-16 text-sm text-text-secondary">Loading…</div>;
  }

  if (status === "anonymous") {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
        <h1 className="text-xl font-semibold text-text-primary">You&apos;ve been invited to a DevToolbox team workspace</h1>
        <p className="text-sm text-text-secondary">
          Sign in or create an account with the email address this invite was sent to, and you&apos;ll be added
          automatically.
        </p>
        <div className="flex gap-2">
          <Link href={`/login?next=${nextParam}`}>
            <Button size="sm">Log in</Button>
          </Link>
          <Link href={`/register?next=${nextParam}`}>
            <Button variant="secondary" size="sm">
              Create account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      {accepting && <p className="text-sm text-text-secondary">Accepting invite…</p>}
      {error && (
        <>
          <p className="text-sm text-danger">{error}</p>
          <Link href="/account/organizations" className="text-sm text-accent hover:underline">
            Go to your team workspaces
          </Link>
        </>
      )}
      {result && (
        <>
          <h1 className="text-xl font-semibold text-text-primary">You&apos;re in!</h1>
          <p className="text-sm text-text-secondary">
            You&apos;ve joined <strong>{result.organizationName}</strong> as {result.role.toLowerCase()}.
          </p>
          <Button size="sm" className="self-start" onClick={() => router.push(`/account/organizations/${result.organizationId}`)}>
            Go to workspace
          </Button>
        </>
      )}
    </div>
  );
}
