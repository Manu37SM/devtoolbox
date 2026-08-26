import { NetService } from "./net.service";

function createFakeRedis() {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();
  return {
    set: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
      return "OK";
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      lists.delete(key);
      return 1;
    }),
    exists: jest.fn(async (key: string) => (store.has(key) ? 1 : 0)),
    rpush: jest.fn(async (key: string, value: string) => {
      const list = lists.get(key) ?? [];
      list.push(value);
      lists.set(key, list);
      return list.length;
    }),
    ltrim: jest.fn(async () => "OK"),
    expire: jest.fn(async () => 1),
    lrange: jest.fn(async (key: string) => lists.get(key) ?? []),
  };
}

describe("NetService", () => {
  let service: NetService;
  let redis: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    redis = createFakeRedis();

    service = new NetService(redis as any);
  });

  describe("webhook inbox lifecycle", () => {
    it("creates an inbox with an absolute URL and future expiry", async () => {
      const result = await service.createWebhookInbox("https://api.example.com");
      expect(result.inboxUrl).toBe(`https://api.example.com/v1/net/webhook-inbox/${result.id}/capture`);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it("captures an event into a freshly created inbox", async () => {
      const { id } = await service.createWebhookInbox("https://api.example.com");
      const captured = await service.captureWebhookEvent(id, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"hello":"world"}',
        query: {},
      });
      expect(captured).toBe(true);

      const events = await service.getWebhookEvents(id);
      expect(events).toHaveLength(1);
      expect(events?.[0]?.method).toBe("POST");
      expect(events?.[0]?.body).toBe('{"hello":"world"}');
      expect(events?.[0]?.id).toBeTruthy();
      expect(events?.[0]?.receivedAt).toBeGreaterThan(0);
    });

    it("rejects capturing into a non-existent/expired inbox", async () => {
      const captured = await service.captureWebhookEvent("does-not-exist", {
        method: "GET",
        headers: {},
        body: "",
        query: {},
      });
      expect(captured).toBe(false);
    });

    it("returns null (not an empty array) for a non-existent inbox's events", async () => {
      const events = await service.getWebhookEvents("does-not-exist");
      expect(events).toBeNull();
    });

    it("returns an empty array for a real inbox with no events yet", async () => {
      const { id } = await service.createWebhookInbox("https://api.example.com");
      const events = await service.getWebhookEvents(id);
      expect(events).toEqual([]);
    });

    it("accumulates multiple events in order", async () => {
      const { id } = await service.createWebhookInbox("https://api.example.com");
      await service.captureWebhookEvent(id, { method: "GET", headers: {}, body: "", query: {} });
      await service.captureWebhookEvent(id, { method: "POST", headers: {}, body: "second", query: {} });

      const events = await service.getWebhookEvents(id);
      expect(events).toHaveLength(2);
      expect(events?.[0]?.method).toBe("GET");
      expect(events?.[1]?.body).toBe("second");
    });
  });

  describe("dnsLookup", () => {
    it("returns an empty records array (not a thrown error) for a domain that doesn't resolve", async () => {
      const result = await service.dnsLookup({ domain: "this-domain-should-not-exist-devtoolbox-test.invalid", recordType: "A" });
      expect(result.records).toEqual([]);
      expect(result.domain).toBe("this-domain-should-not-exist-devtoolbox-test.invalid");
      expect(result.recordType).toBe("A");
    });
  });

  describe("ipLookup", () => {
    it("falls back to returning just the IP when the geolocation call fails", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

      const result = await service.ipLookup({ ip: "8.8.8.8" }, "127.0.0.1");
      expect(result).toEqual({ ip: "8.8.8.8" });

      global.fetch = originalFetch;
    });

    it("uses the caller's IP when none is explicitly given", async () => {
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

      const result = await service.ipLookup({}, "203.0.113.5");
      expect(result.ip).toBe("203.0.113.5");

      global.fetch = originalFetch;
    });
  });
});
