import type { WebhookInboxCreateResultDto, WebhookInboxEvent } from "@devtoolbox/shared";
import { apiGet, apiPost } from "@/lib/api-client";

export async function createWebhookInbox(): Promise<WebhookInboxCreateResultDto> {
  return apiPost<WebhookInboxCreateResultDto>("/net/webhook-inbox", {});
}

export async function fetchWebhookEvents(inboxId: string): Promise<WebhookInboxEvent[]> {
  const response = await apiGet<{ events: WebhookInboxEvent[] }>(`/net/webhook-inbox/${inboxId}/events`);
  return response.events;
}
