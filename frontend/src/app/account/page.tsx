"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LinkedOAuthAccount, UserProfile } from "@devtoolbox/shared";
import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const PROVIDER_LABEL: Record<string, string> = { github: "GitHub", google: "Google" };

export default function AccountPage() {
  const router = useRouter();
  const { user, status, clearSession, setSession, accessToken } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedOAuthAccount[] | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user?.displayName]);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiGet<{ accounts: LinkedOAuthAccount[] }>("/auth/oauth/linked", { authenticated: true })
      .then((res) => setLinkedAccounts(res.accounts))
      .catch(() => setLinkedAccounts([]));
  }, [status]);

  async function onDisconnect(provider: string) {
    setLinkedError(null);
    setDisconnecting(provider);
    try {
      await apiDelete(`/auth/oauth/${provider}`, { authenticated: true });
      setLinkedAccounts((prev) => (prev ? prev.filter((a) => a.provider !== provider) : prev));
    } catch (err) {
      setLinkedError(err instanceof ApiClientError ? err.message : "Couldn't disconnect. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

  if (status === "loading" || !user) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-sm text-text-secondary">Loading…</div>;
  }

  async function onSaveProfile() {
    setProfileError(null);
    setSavingProfile(true);
    try {
      const updated = await apiPatch<UserProfile>("/users/me", { displayName }, { authenticated: true });
      setSession(accessToken as string, updated);
    } catch (err) {
      setProfileError(err instanceof ApiClientError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function onLogout() {
    try {
      await apiPost("/auth/logout", undefined);
    } finally {
      clearSession();
      router.push("/");
    }
  }

  async function onSyncNow() {
    setSyncMessage("Syncing…");
    try {
      await syncFavoritesOnSignIn();
      setSyncMessage("Favorites synced.");
    } catch {
      setSyncMessage("Sync failed — try again in a moment.");
    }
  }

  async function onExport() {
    setExporting(true);
    try {
      const data = await apiGet<Record<string, unknown>>("/users/me/export", { authenticated: true });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "devtoolbox-export.json";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function onDelete() {
    if (!confirm("Delete your account? This can't be undone after the 30-day grace period.")) return;
    setDeleting(true);
    try {
      await apiDelete("/users/me", { authenticated: true });
      clearSession();
      router.push("/");
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-10 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Account</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-text-secondary">
          <span>{user.email}</span>
          <Badge variant={user.emailVerified ? "success" : "warning"}>
            {user.emailVerified ? "Verified" : "Unverified"}
          </Badge>
          <Badge variant="neutral">{user.plan}</Badge>
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Profile</h2>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Display name
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        {profileError && <p className="text-sm text-danger">{profileError}</p>}
        <Button size="sm" className="self-start" onClick={onSaveProfile} disabled={savingProfile}>
          {savingProfile ? "Saving…" : "Save"}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Sync</h2>
        <p className="text-sm text-text-secondary">
          Favorites saved on this device are merged with your account. History starts syncing from now on — past
          local history isn&apos;t uploaded automatically.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" className="self-start" onClick={onSyncNow}>
            Sync favorites now
          </Button>
          {syncMessage && <span className="text-sm text-text-secondary">{syncMessage}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Connected accounts</h2>
        {linkedAccounts === null ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : (
          <>
            {linkedAccounts.length > 0 && (
              <ul className="flex flex-col gap-2">
                {linkedAccounts.map((account) => (
                  <li
                    key={account.provider}
                    className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm"
                  >
                    <span className="text-text-primary">{PROVIDER_LABEL[account.provider] ?? account.provider}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDisconnect(account.provider)}
                      disabled={disconnecting === account.provider}
                    >
                      {disconnecting === account.provider ? "Disconnecting…" : "Disconnect"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {linkedError && <p className="text-sm text-danger">{linkedError}</p>}
            <OAuthButtons
              mode="link"
              connectedProviders={linkedAccounts.map((a) => a.provider) as Array<"github" | "google">}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Your data</h2>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={onExport} disabled={exporting}>
            {exporting ? "Preparing…" : "Export data (JSON)"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border-default pt-6">
        <h2 className="text-sm font-medium text-danger">Danger zone</h2>
        <p className="text-sm text-text-secondary">
          Deleting your account revokes all sessions immediately; the account itself is recoverable for 30 days —
          contact support within that window if this was a mistake.
        </p>
        <Button variant="destructive" size="sm" className="self-start" onClick={onDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Delete account"}
        </Button>
      </section>

      <Link href="/" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
        ← Back to tools
      </Link>
    </div>
  );
}
