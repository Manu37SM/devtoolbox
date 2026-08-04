import { describe, expect, it, vi, beforeEach } from "vitest";
import type { WebhookInboxCreateResultDto, WebhookInboxEvent } from "@devtoolbox/shared";

vi.mock("@/lib/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.name = "ApiClientError";
      this.status = status;
      this.code = code;
    }
  },
}));

import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { createWebhookInbox, fetchWebhookEvents } from "./transform";

describe("createWebhookInbox", () => {
  beforeEach(() => {
    vi.mocked(apiPost).mockReset();
  });

  it("calls apiPost with the /net/webhook-inbox path and an empty payload", async () => {
    const result: WebhookInboxCreateResultDto = {
      id: "inbox_1",
      inboxUrl: "https://api.devtoolbox.dev/v1/net/webhook-inbox/inbox_1",
      expiresAt: Date.now() + 60_000,
    };
    vi.mocked(apiPost).mockResolvedValue(result);

    const returned = await createWebhookInbox();

    expect(apiPost).toHaveBeenCalledWith("/net/webhook-inbox", {});
    expect(returned).toBe(result);
  });

  it("lets ApiClientError from apiPost propagate", async () => {
    vi.mocked(apiPost).mockRejectedValue(new ApiClientError("Rate limited", 429));
    await expect(createWebhookInbox()).rejects.toThrow("Rate limited");
  });
});

describe("fetchWebhookEvents", () => {
  beforeEach(() => {
    vi.mocked(apiGet).mockReset();
  });

  it("calls apiGet with the inbox events path and returns the events array", async () => {
    const events: WebhookInboxEvent[] = [
      { id: "evt_1", receivedAt: Date.now(), method: "POST", headers: {}, body: "{}", query: {} },
    ];
    vi.mocked(apiGet).mockResolvedValue({ events });

    const returned = await fetchWebhookEvents("inbox_1");

    expect(apiGet).toHaveBeenCalledWith("/net/webhook-inbox/inbox_1/events");
    expect(returned).toBe(events);
  });

  it("lets a 404 ApiClientError propagate for the caller to treat as expired", async () => {
    vi.mocked(apiGet).mockRejectedValue(new ApiClientError("Not found", 404));
    await expect(fetchWebhookEvents("inbox_1")).rejects.toMatchObject({ status: 404 });
  });
});
