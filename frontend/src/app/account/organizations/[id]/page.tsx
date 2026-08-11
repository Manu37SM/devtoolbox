"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrganizationDetail, OrganizationUsageSummary } from "@devtoolbox/shared";
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

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  async function load() {
    try {
      const detail = await apiGet<OrganizationDetail>(`/organizations/${id}`, { authenticated: true });
      setOrg(detail);
      setRenameValue(detail.name);
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

  async function onAddMember() {
    setError(null);
    setAddingMember(true);
    try {
      await apiPost(`/organizations/${id}/members`, { email: newMemberEmail }, { authenticated: true });
      setNewMemberEmail("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't add that member. Please try again.");
    } finally {
      setAddingMember(false);
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
          <div className="flex gap-2">
            <Input
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="Add by email (must already have an account)"
              className="max-w-64"
            />
            <Button size="sm" onClick={onAddMember} disabled={addingMember || !newMemberEmail.trim()}>
              {addingMember ? "Adding…" : "Add"}
            </Button>
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
