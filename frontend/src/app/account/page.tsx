"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  ApiKeyCreatedResult,
  ApiKeySummary,
  BillablePlan,
  CancelSubscriptionResult,
  CreateSubscriptionResult,
  LinkedOAuthAccount,
  SubscriptionSummary,
  UserProfile,
} from "@devtoolbox/shared";
import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

const PROVIDER_LABEL: Record<string, string> = { github: "GitHub", google: "Google" };

interface RazorpayCheckoutOptions {
  key: string;
  subscription_id: string;
  name: string;
  description?: string;
  prefill?: { email?: string };
  handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayCheckoutInstance {
  open: () => void;
}
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error("Couldn't load the payment provider. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

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
  const [apiKeys, setApiKeys] = useState<ApiKeySummary[] | null>(null);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [justCreatedKey, setJustCreatedKey] = useState<ApiKeyCreatedResult | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingActionPlan, setBillingActionPlan] = useState<BillablePlan | "cancel" | null>(null);

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

  useEffect(() => {
    if (status !== "authenticated" || user?.plan === "FREE") return;
    apiGet<ApiKeySummary[]>("/api-keys", { authenticated: true })
      .then(setApiKeys)
      .catch(() => setApiKeys([]));
  }, [status, user?.plan]);

  async function onCreateApiKey() {
    setApiKeyError(null);
    setCreatingKey(true);
    try {
      const created = await apiPost<ApiKeyCreatedResult>("/api-keys", { name: newKeyName }, { authenticated: true });
      setJustCreatedKey(created);
      setNewKeyName("");
      setApiKeys((prev) => [
        { id: created.id, name: created.name, keyPrefix: created.keyPrefix, lastUsedAt: null, revokedAt: null, createdAt: created.createdAt },
        ...(prev ?? []),
      ]);
    } catch (err) {
      setApiKeyError(err instanceof ApiClientError ? err.message : "Couldn't create a key. Please try again.");
    } finally {
      setCreatingKey(false);
    }
  }

  async function onRevokeApiKey(id: string) {
    setApiKeyError(null);
    setRevokingKeyId(id);
    try {
      await apiDelete(`/api-keys/${id}`, { authenticated: true });
      setApiKeys((prev) => (prev ? prev.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)) : prev));
    } catch (err) {
      setApiKeyError(err instanceof ApiClientError ? err.message : "Couldn't revoke this key. Please try again.");
    } finally {
      setRevokingKeyId(null);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || user?.plan === "FREE") return;
    apiGet<SubscriptionSummary | null>("/billing/subscription", { authenticated: true })
      .then(setSubscription)
      .catch(() => setSubscription(null));
  }, [status, user?.plan]);

  async function onUpgrade(plan: BillablePlan) {
    setBillingError(null);
    setBillingActionPlan(plan);
    try {
      await loadRazorpayCheckoutScript();
      const { razorpaySubscriptionId, razorpayKeyId } = await apiPost<CreateSubscriptionResult>(
        "/billing/subscription",
        { plan },
        { authenticated: true },
      );

      const checkout = new window.Razorpay({
        key: razorpayKeyId,
        subscription_id: razorpaySubscriptionId,
        name: "DevToolbox",
        description: `${plan} plan`,
        prefill: { email: user?.email },
        handler: async (response) => {
          try {
            const summary = await apiPost<SubscriptionSummary | null>(
              "/billing/verify-payment",
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              },
              { authenticated: true },
            );
            setSubscription(summary);
          } catch (err) {
            setBillingError(err instanceof ApiClientError ? err.message : "Payment succeeded but couldn't be verified — contact support.");
          } finally {
            setBillingActionPlan(null);
          }
        },
        modal: {
          ondismiss: () => setBillingActionPlan(null),
        },
      });
      checkout.open();
    } catch (err) {
      setBillingError(err instanceof ApiClientError ? err.message : "Couldn't start checkout. Please try again.");
      setBillingActionPlan(null);
    }
  }

  async function onCancelSubscription() {
    setBillingError(null);
    setBillingActionPlan("cancel");
    try {
      await apiPost<CancelSubscriptionResult>("/billing/cancel-subscription", {}, { authenticated: true });
      const summary = await apiGet<SubscriptionSummary | null>("/billing/subscription", { authenticated: true });
      setSubscription(summary);
    } catch (err) {
      setBillingError(err instanceof ApiClientError ? err.message : "Couldn't cancel the subscription. Please try again.");
    } finally {
      setBillingActionPlan(null);
    }
  }

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
        <h2 className="text-sm font-medium text-text-primary">Plan & billing</h2>
        <p className="text-sm text-text-secondary">
          {user.plan === "FREE"
            ? "Free covers every tool, no ceiling — PRO/TEAM add higher AI usage quotas and Public API/CLI access (see the API keys section below)."
            : subscription
              ? `${subscription.cancelAtPeriodEnd ? "Cancels" : "Renews"} on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`
              : "Loading subscription details…"}
        </p>
        {billingError && <p className="text-sm text-danger">{billingError}</p>}
        {user.plan === "FREE" ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onUpgrade("PRO")} disabled={billingActionPlan !== null}>
              {billingActionPlan === "PRO" ? "Opening checkout…" : "Upgrade to PRO"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onUpgrade("TEAM")} disabled={billingActionPlan !== null}>
              {billingActionPlan === "TEAM" ? "Opening checkout…" : "Upgrade to TEAM"}
            </Button>
          </div>
        ) : (
          !subscription?.cancelAtPeriodEnd && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={onCancelSubscription}
              disabled={billingActionPlan !== null}
            >
              {billingActionPlan === "cancel" ? "Cancelling…" : "Cancel subscription"}
            </Button>
          )
        )}
      </section>

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
          {}
          <Button variant="secondary" size="sm" onClick={onLogout}>
            Log out
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Team workspaces</h2>
        <p className="text-sm text-text-secondary">
          Shared snippets/pipelines and a pooled AI-usage dashboard for your team (API.md §17).
        </p>
        <Link href="/account/organizations" className="self-start">
          <Button variant="secondary" size="sm">
            Manage organizations
          </Button>
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">API keys</h2>
        {user.plan === "FREE" ? (
          <p className="text-sm text-text-secondary">
            The Public API (for CI/scripting use — see the CLI docs) requires a PRO or TEAM plan.
          </p>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              Used by the DevToolbox CLI and any scripts calling the Public API directly. A key&apos;s full value is
              shown only once, right after you create it.
            </p>
            {justCreatedKey && (
              <div className="flex flex-col gap-1 rounded-md border border-accent/40 bg-accent/5 p-3 text-sm">
                <span className="text-text-secondary">
                  Copy this now — it won&apos;t be shown again: <strong>{justCreatedKey.name}</strong>
                </span>
                <code className="break-all rounded-sm bg-bg-raised px-2 py-1 font-mono text-xs">{justCreatedKey.key}</code>
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setJustCreatedKey(null)}>
                  Done
                </Button>
              </div>
            )}
            {apiKeys === null ? (
              <p className="text-sm text-text-secondary">Loading…</p>
            ) : (
              <>
                {apiKeys.length > 0 && (
                  <ul className="flex flex-col gap-2">
                    {apiKeys.map((key) => (
                      <li
                        key={key.id}
                        className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="text-text-primary">{key.name}</span>
                          <span className="font-mono text-xs text-text-muted">
                            {key.keyPrefix}… {key.revokedAt && <Badge variant="neutral">Revoked</Badge>}
                          </span>
                        </div>
                        {!key.revokedAt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRevokeApiKey(key.id)}
                            disabled={revokingKeyId === key.id}
                          >
                            {revokingKeyId === key.id ? "Revoking…" : "Revoke"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {apiKeyError && <p className="text-sm text-danger">{apiKeyError}</p>}
                <div className="flex gap-2">
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name (e.g. CI pipeline)"
                    className="max-w-56"
                  />
                  <Button size="sm" onClick={onCreateApiKey} disabled={creatingKey || !newKeyName.trim()}>
                    {creatingKey ? "Creating…" : "Create key"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
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
