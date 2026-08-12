"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  AddOrganizationMemberResult,
  OrganizationDetail,
  OrganizationInviteSummary,
  OrganizationUsageSummary,
  SsoConnectionSummary,
  UpsertSsoConnectionDto,
} from "@devtoolbox/shared";
import { apiDelete, apiGet, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
}

// Org detail: member management (OWNER/ADMIN) and the AI-usage dashboard
// (OWNER/ADMIN only — API.md §17). A plain MEMBER sees the roster but not
// the usage numbers or the edit controls; the 403 from GET /usage is
// treated as "not available to you," not an error to surface.
export default function OrganizationDetailPage({ params }: OrganizationDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { status } = useAuthStore();

  const [org, setOrg] = useState<OrganizationDetail | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberActionUserId, setMemberActionUserId] = useState<string | null>(null);
  const [usage, setUsage] = useState<OrganizationUsageSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [invites, setInvites] = useState<OrganizationInviteSummary[]>([]);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [savingBranding, setSavingBranding] = useState(false);

  const [sso, setSso] = useState<SsoConnectionSummary | null | undefined>(undefined);
  const [ssoProtocol, setSsoProtocol] = useState<"OIDC" | "SAML">("OIDC");
  const [ssoDomain, setSsoDomain] = useState("");
  const [oidcIssuer, setOidcIssuer] = useState("");
  const [oidcClientId, setOidcClientId] = useState("");
  const [oidcClientSecret, setOidcClientSecret] = useState("");
  const [samlEntryPoint, setSamlEntryPoint] = useState("");
  const [samlIssuer, setSamlIssuer] = useState("");
  const [samlCert, setSamlCert] = useState("");
  const [savingSso, setSavingSso] = useState(false);
  const [removingSso, setRemovingSso] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  async function load() {
    try {
      const detail = await apiGet<OrganizationDetail>(`/organizations/${id}`, { authenticated: true });
      setOrg(detail);
      setRenameValue(detail.name);
      setBrandName(detail.brandName ?? "");
      setBrandLogoUrl(detail.brandLogoUrl ?? "");
    } catch {
      setOrg(null);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, id]);

  useEffect(() => {
    if (!org || (org.role !== "OWNER" && org.role !== "ADMIN")) return;
    apiGet<OrganizationUsageSummary>(`/organizations/${id}/usage`, { authenticated: true })
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [org, id]);

  async function loadInvites() {
    try {
      setInvites(await apiGet<OrganizationInviteSummary[]>(`/organizations/${id}/invites`, { authenticated: true }));
    } catch {
      setInvites([]);
    }
  }

  useEffect(() => {
    if (!org || (org.role !== "OWNER" && org.role !== "ADMIN")) return;
    void loadInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, id]);

  async function loadSso() {
    try {
      const conn = await apiGet<SsoConnectionSummary | null>(`/organizations/${id}/sso`, { authenticated: true });
      setSso(conn);
      if (conn) {
        setSsoProtocol(conn.protocol);
        setSsoDomain(conn.domain);
        setOidcIssuer(conn.oidcIssuer ?? "");
        setOidcClientId(conn.oidcClientId ?? "");
        setSamlEntryPoint(conn.samlEntryPoint ?? "");
        setSamlIssuer(conn.samlIssuer ?? "");
        setSamlCert(conn.samlCert ?? "");
      }
    } catch {
      setSso(null);
    }
  }

  useEffect(() => {
    if (!org || org.role !== "OWNER") return;
    void loadSso();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org, id]);

  async function onSaveSso() {
    setError(null);
    setSavingSso(true);
    try {
      const dto: UpsertSsoConnectionDto =
        ssoProtocol === "OIDC"
          ? {
              protocol: "OIDC",
              domain: ssoDomain.trim(),
              oidcIssuer: oidcIssuer.trim(),
              oidcClientId: oidcClientId.trim(),
              ...(oidcClientSecret.trim() ? { oidcClientSecret: oidcClientSecret.trim() } : {}),
            }
          : {
              protocol: "SAML",
              domain: ssoDomain.trim(),
              samlEntryPoint: samlEntryPoint.trim(),
              samlIssuer: samlIssuer.trim(),
              samlCert: samlCert.trim(),
            };
      await apiPost(`/organizations/${id}/sso`, dto, { authenticated: true });
      setOidcClientSecret("");
      await loadSso();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save SSO settings. Please try again.");
    } finally {
      setSavingSso(false);
    }
  }

  async function onToggleSsoEnabled() {
    if (!sso) return;
    setError(null);
    try {
      await apiPost(`/organizations/${id}/sso/enabled`, { enabled: !sso.enabled }, { authenticated: true });
      await loadSso();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't update SSO status.");
    }
  }

  async function onRemoveSso() {
    if (!confirm("Remove this SSO connection? Members will need to sign in with email/password or OAuth instead.")) return;
    setError(null);
    setRemovingSso(true);
    try {
      await apiDelete(`/organizations/${id}/sso`, { authenticated: true });
      setSso(null);
      setSsoDomain("");
      setOidcIssuer("");
      setOidcClientId("");
      setOidcClientSecret("");
      setSamlEntryPoint("");
      setSamlIssuer("");
      setSamlCert("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't remove the SSO connection.");
    } finally {
      setRemovingSso(false);
    }
  }

  async function onSaveBranding() {
    setError(null);
    setSavingBranding(true);
    try {
      await apiPatch(
        `/organizations/${id}/branding`,
        { brandName: brandName.trim() || null, brandLogoUrl: brandLogoUrl.trim() || null },
        { authenticated: true },
      );
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save branding. Please try again.");
    } finally {
      setSavingBranding(false);
    }
  }

  async function onRename() {
    setError(null);
    setRenaming(true);
    try {
      await apiPatch(`/organizations/${id}`, { name: renameValue }, { authenticated: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't rename. Please try again.");
    } finally {
      setRenaming(false);
    }
  }

  // No account with this email yet? Falls back to an email-token invite
  // instead of erroring — the backend decides which happened, this just
  // reflects it back (AUDIT_REPORT.md §21).
  async function onAddMember() {
    setError(null);
    setInviteMessage(null);
    setAddingMember(true);
    try {
      const result = await apiPost<AddOrganizationMemberResult>(
        `/organizations/${id}/members`,
        { email: newMemberEmail },
        { authenticated: true },
      );
      setNewMemberEmail("");
      if (result.status === "invited") {
        setInviteMessage(`Invite sent to ${result.invite.email} — expires ${new Date(result.invite.expiresAt).toLocaleDateString()}.`);
        await loadInvites();
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't add that member. Please try again.");
    } finally {
      setAddingMember(false);
    }
  }

  async function onRevokeInvite(inviteId: string) {
    setError(null);
    setRevokingInviteId(inviteId);
    try {
      await apiDelete(`/organizations/${id}/invites/${inviteId}`, { authenticated: true });
      await loadInvites();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't revoke that invite.");
    } finally {
      setRevokingInviteId(null);
    }
  }

  async function onChangeRole(userId: string, role: "ADMIN" | "MEMBER") {
    setError(null);
    setMemberActionUserId(userId);
    try {
      await apiPatch(`/organizations/${id}/members/${userId}`, { role }, { authenticated: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't change that member's role.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function onRemoveMember(userId: string) {
    setError(null);
    setMemberActionUserId(userId);
    try {
      await apiDelete(`/organizations/${id}/members/${userId}`, { authenticated: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't remove that member.");
    } finally {
      setMemberActionUserId(null);
    }
  }

  async function onDelete() {
    if (!org || !confirm(`Delete "${org.name}"? Members keep their own snippets/pipelines; shared ones are removed.`)) {
      return;
    }
    setDeleting(true);
    try {
      await apiDelete(`/organizations/${id}`, { authenticated: true });
      router.push("/account/organizations");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete the organization.");
      setDeleting(false);
    }
  }

  if (org === undefined) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-sm text-text-secondary">Loading…</div>;
  }
  if (org === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-sm text-text-secondary">Organization not found, or you&apos;re not a member.</p>
        <Link href="/account/organizations" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← Back to team workspaces
        </Link>
      </div>
    );
  }

  const canManage = org.role === "OWNER" || org.role === "ADMIN";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-16">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-text-primary">{org.name}</h1>
          <Badge variant="neutral">{org.role}</Badge>
        </div>
        <Link href="/account/organizations" className="mt-1 inline-block text-sm text-text-secondary hover:underline">
          ← All organizations
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {org.role === "OWNER" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-primary">Organization name</h2>
          <div className="flex gap-2">
            <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="max-w-56" />
            <Button size="sm" onClick={onRename} disabled={renaming || !renameValue.trim()}>
              {renaming ? "Saving…" : "Save"}
            </Button>
          </div>
        </section>
      )}

      {org.role === "OWNER" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-primary">Branding for shared links</h2>
          <p className="text-sm text-text-secondary">
            When a member shares a tool&apos;s output as this org, the public link shows this name/logo instead of
            default DevToolbox branding.
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-text-primary">
            Brand name
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Acme Platform Team"
              className="max-w-72"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-text-primary">
            Logo URL <span className="text-text-muted">(optional)</span>
            <Input
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              placeholder="https://…/logo.png"
              className="max-w-72"
            />
          </label>
          <Button size="sm" className="self-start" onClick={onSaveBranding} disabled={savingBranding}>
            {savingBranding ? "Saving…" : "Save branding"}
          </Button>
        </section>
      )}

      {org.role === "OWNER" && sso !== undefined && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-text-primary">Single sign-on (SSO)</h2>
            {sso && <Badge variant={sso.enabled ? "success" : "neutral"}>{sso.enabled ? "Enabled" : "Disabled"}</Badge>}
          </div>
          <p className="text-sm text-text-secondary">
            Let anyone with an email at this domain sign in through your identity provider instead of a DevToolbox
            password. First-time SSO sign-in automatically joins this org as a member.
          </p>

          <div className="flex gap-2">
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                type="radio"
                name="ssoProtocol"
                checked={ssoProtocol === "OIDC"}
                onChange={() => setSsoProtocol("OIDC")}
              />
              OIDC
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                type="radio"
                name="ssoProtocol"
                checked={ssoProtocol === "SAML"}
                onChange={() => setSsoProtocol("SAML")}
              />
              SAML
            </label>
          </div>

          <label className="flex flex-col gap-1.5 text-sm text-text-primary">
            Email domain
            <Input value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} placeholder="acme.com" className="max-w-72" />
          </label>

          {ssoProtocol === "OIDC" ? (
            <>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                Issuer URL
                <Input
                  value={oidcIssuer}
                  onChange={(e) => setOidcIssuer(e.target.value)}
                  placeholder="https://your-idp.example.com"
                  className="max-w-96"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                Client ID
                <Input value={oidcClientId} onChange={(e) => setOidcClientId(e.target.value)} className="max-w-96" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                Client secret {sso?.oidcHasClientSecret && <span className="text-text-muted">(leave blank to keep the current one)</span>}
                <Input
                  type="password"
                  value={oidcClientSecret}
                  onChange={(e) => setOidcClientSecret(e.target.value)}
                  className="max-w-96"
                />
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                IdP sign-in URL (entry point)
                <Input
                  value={samlEntryPoint}
                  onChange={(e) => setSamlEntryPoint(e.target.value)}
                  placeholder="https://your-idp.example.com/sso/saml"
                  className="max-w-96"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                IdP entity ID (issuer)
                <Input value={samlIssuer} onChange={(e) => setSamlIssuer(e.target.value)} className="max-w-96" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm text-text-primary">
                IdP signing certificate (PEM)
                <textarea
                  value={samlCert}
                  onChange={(e) => setSamlCert(e.target.value)}
                  rows={4}
                  className="max-w-96 rounded-md border border-border-default bg-bg-raised px-3 py-2 text-sm"
                />
              </label>
            </>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={onSaveSso} disabled={savingSso || !ssoDomain.trim()}>
              {savingSso ? "Saving…" : sso ? "Save changes" : "Set up SSO"}
            </Button>
            {sso && (
              <>
                <Button variant="ghost" size="sm" onClick={onToggleSsoEnabled}>
                  {sso.enabled ? "Disable" : "Enable"}
                </Button>
                <Button variant="ghost" size="sm" onClick={onRemoveSso} disabled={removingSso}>
                  {removingSso ? "Removing…" : "Remove"}
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-primary">Members</h2>
        <ul className="flex flex-col gap-2">
          {org.members.map((m) => (
            <li
              key={m.userId}
              className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="text-text-primary">{m.displayName ?? m.email}</span>
                <span className="text-xs text-text-muted">{m.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="neutral">{m.role}</Badge>
                {canManage && m.role !== "OWNER" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onChangeRole(m.userId, m.role === "ADMIN" ? "MEMBER" : "ADMIN")}
                      disabled={memberActionUserId === m.userId}
                    >
                      {m.role === "ADMIN" ? "Make member" : "Make admin"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMember(m.userId)}
                      disabled={memberActionUserId === m.userId}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>

        {canManage && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Add by email"
                className="max-w-64"
              />
              <Button size="sm" onClick={onAddMember} disabled={addingMember || !newMemberEmail.trim()}>
                {addingMember ? "Adding…" : "Add"}
              </Button>
            </div>
            <p className="text-xs text-text-muted">
              Already has an account? They&apos;re added right away. Otherwise we&apos;ll email them an invite link.
            </p>
            {inviteMessage && <p className="text-sm text-text-secondary">{inviteMessage}</p>}
          </div>
        )}

        {canManage && invites.length > 0 && (
          <div className="flex flex-col gap-2 pt-2">
            <h3 className="text-xs font-medium uppercase text-text-muted">Pending invites</h3>
            <ul className="flex flex-col gap-2">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-text-primary">{invite.email}</span>
                    <span className="text-xs text-text-muted">
                      Invited by {invite.invitedByEmail} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRevokeInvite(invite.id)}
                    disabled={revokingInviteId === invite.id}
                  >
                    {revokingInviteId === invite.id ? "Revoking…" : "Revoke"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {canManage && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-primary">AI usage — last {usage?.periodDays ?? 30} days</h2>
          {usage === null ? (
            <p className="text-sm text-text-secondary">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-text-secondary">
                {usage.totalRequests} requests · {usage.totalInputTokens + usage.totalOutputTokens} tokens across the
                org.
              </p>
              <ul className="flex flex-col gap-1">
                {usage.byMember.map((m) => (
                  <li key={m.userId} className="flex justify-between text-sm text-text-secondary">
                    <span>{m.email}</span>
                    <span>
                      {m.requests} req · {m.inputTokens + m.outputTokens} tok
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {org.role === "OWNER" && (
        <section className="flex flex-col gap-3 border-t border-border-default pt-6">
          <h2 className="text-sm font-medium text-danger">Danger zone</h2>
          <p className="text-sm text-text-secondary">
            Deletes the organization. Members keep their own snippets/pipelines — only the shared visibility is
            removed.
          </p>
          <Button variant="destructive" size="sm" className="self-start" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete organization"}
          </Button>
        </section>
      )}
    </div>
  );
}
