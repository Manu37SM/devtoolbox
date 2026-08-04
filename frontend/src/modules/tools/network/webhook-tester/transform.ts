import type { WebhookInboxCreateResultDto, WebhookInboxEvent } from "@devtoolbox/shared";
import { apiGet, apiPost } from "@/lib/api-client";

/** Creates a temporary inbox that captures inbound HTTP requests
 * (API.md §10) — receiving a real inbound request needs a publicly
 * reachable server endpoint, which a browser tab can never be. Thin
 * call-forwarding wrapper; errors propagate as `ApiClientError`. */
export async function createWebhookInbox(): Promise<WebhookInboxCreateResultDto> {
  return apiPost<WebhookInboxCreateResultDto>("/net/webhook-inbox", {});
}

/** Polls captured events for an existing inbox. Throws `ApiClientError`
 * (status 404) once the inbox has expired — the caller is responsible for
 * treating that as "expired" rather than a generic error. */
export async function fetchWebhookEvents(inboxId: string): Promise<WebhookInboxEvent[]> {
  const response = await apiGet<{ events: WebhookInboxEvent[] }>(`/net/webhook-inbox/${inboxId}/events`);
  return response.events;
}
