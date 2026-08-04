"use client";

import { useEffect, useRef, useState } from "react";
import type { WebhookInboxCreateResultDto, WebhookInboxEvent } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/tools/CopyButton";
import { ApiClientError } from "@/lib/api-client";
import { createWebhookInbox, fetchWebhookEvents } from "./transform";

const POLL_INTERVAL_MS = 3000;

export function WebhookTesterToolView() {
  const [inbox, setInbox] = useState<WebhookInboxCreateResultDto | null>(null);
  const [events, setEvents] = useState<WebhookInboxEvent[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function pollEvents(inboxId: string) {
    try {
      const fetched = await fetchWebhookEvents(inboxId);
      setEvents(fetched);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setExpired(true);
        stopPolling();
      }
      // Transient errors (network blip) are silently retried on the next tick.
    }
  }

  useEffect(() => {
    if (!inbox) return;
    void pollEvents(inbox.id);
    intervalRef.current = setInterval(() => void pollEvents(inbox.id), POLL_INTERVAL_MS);
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox]);

  async function handleCreateInbox() {
    setCreating(true);
    setCreateError(null);
    stopPolling();
    setEvents([]);
    setExpired(false);
    try {
      const created = await createWebhookInbox();
      setInbox(created);
    } catch (err) {
      setCreateError(err instanceof ApiClientError ? err.message : "Could not create an inbox.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
        This tool sends your input to our server to fetch the result — see why in &ldquo;How it works&rdquo;
        below.
      </div>

      <div>
        <Button onClick={handleCreateInbox} disabled={creating}>
          {creating ? "Creating…" : inbox ? "Create new inbox" : "Create inbox"}
        </Button>
        {createError && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {createError}
          </p>
        )}
      </div>

      {inbox && (
        <>
          <div className="flex flex-col gap-1 rounded-md border border-border-default p-3">
            <span className="text-sm font-medium text-text-secondary">Inbox URL</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all font-mono text-sm text-text-primary">{inbox.inboxUrl}</code>
              <CopyButton value={inbox.inboxUrl} />
            </div>
            <span className="text-xs text-text-muted">
              Expires {new Date(inbox.expiresAt).toLocaleString()}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {expired ? (
              <p role="alert" className="text-sm text-danger">
                This inbox has expired — create a new one.
              </p>
            ) : events.length === 0 ? (
              <p className="text-sm text-text-muted">Waiting for the first request…</p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...events]
                  .sort((a, b) => b.receivedAt - a.receivedAt)
                  .map((event) => (
                    <div key={event.id} className="rounded-md border border-border-default p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant="info">{event.method}</Badge>
                        <span className="text-xs text-text-muted">
                          {new Date(event.receivedAt).toLocaleString()}
                        </span>
                      </div>
                      <details className="mb-2">
                        <summary className="cursor-pointer text-sm text-text-secondary">Headers</summary>
                        <div className="mt-2 rounded-md border border-border-default">
                          <div className="divide-y divide-border-default">
                            {Object.entries(event.headers).map(([key, value]) => (
                              <div
                                key={key}
                                className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-xs"
                              >
                                <span className="break-all font-mono text-text-secondary">{key}</span>
                                <span className="break-all font-mono text-text-primary">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>
                      {event.body && (
                        <pre className="overflow-auto rounded-md bg-bg-raised p-2 font-mono text-xs text-text-primary">
                          {event.body}
                        </pre>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
