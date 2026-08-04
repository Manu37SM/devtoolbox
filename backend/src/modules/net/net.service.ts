import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { resolve4, resolve6, resolveCname, resolveMx, resolveTxt, resolveNs, resolveSoa } from "node:dns/promises";
import * as cheerio from "cheerio";
import type {
  DnsLookupDto,
  DnsLookupResult,
  HttpRequestProxyDto,
  HttpRequestProxyResult,
  IpLookupDto,
  IpLookupResult,
  UrlPreviewDto,
  UrlPreviewResult,
  WebhookInboxCreateResultDto,
  WebhookInboxEvent,
} from "@devtoolbox/shared";
import { safeFetch, assertUrlIsSafe, SsrfBlockedError } from "../../common/net/ssrf-guard";
import { REDIS_CLIENT } from "../../common/redis/redis.module";
import type Redis from "ioredis";

const HTTP_PROXY_TIMEOUT_MS = 10_000;
const HTTP_PROXY_MAX_BODY_BYTES = 2_000_000; // 2MB cap on both request and response body echoed back
const WEBHOOK_INBOX_TTL_SECONDS = 30 * 60; // 30 minutes, per API.md's "temporary inbox URL" description
const WEBHOOK_MAX_EVENTS = 50; // cap stored events per inbox so a spammed inbox can't grow unbounded in Redis

// Hop-by-hop / connection-management headers that must never be forwarded
// verbatim from the user's requested headers — either meaningless outside
// the original connection or actively dangerous to let a client control
// on our outbound request (RFC 7230 §6.1 hop-by-hop list, plus Host).
const BLOCKED_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

@Injectable()
export class NetService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ── HTTP Request Tester (API.md: POST /net/http-request) ────────────────
  async proxyHttpRequest(dto: HttpRequestProxyDto): Promise<HttpRequestProxyResult> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto.headers ?? {})) {
      if (!BLOCKED_REQUEST_HEADERS.has(key.toLowerCase())) headers[key] = value;
    }

    const start = Date.now();
    const response = await safeFetch(dto.url, {
      method: dto.method,
      headers,
      body: dto.method === "GET" || dto.method === "HEAD" ? undefined : dto.body,
      timeoutMs: HTTP_PROXY_TIMEOUT_MS,
    });

    const { text, truncated } = await readBodyWithCap(response, HTTP_PROXY_MAX_BODY_BYTES);
    const durationMs = Date.now() - start;

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: text,
      bodyTruncated: truncated,
      durationMs,
    };
  }

  // ── DNS Lookup (API.md: GET /net/dns) ────────────────────────────────────
  async dnsLookup(dto: DnsLookupDto): Promise<DnsLookupResult> {
    let records: string[];
    try {
      switch (dto.recordType) {
        case "A":
          records = await resolve4(dto.domain);
          break;
        case "AAAA":
          records = await resolve6(dto.domain);
          break;
        case "CNAME":
          records = await resolveCname(dto.domain);
          break;
        case "MX":
          records = (await resolveMx(dto.domain)).map((r) => `${r.priority} ${r.exchange}`);
          break;
        case "TXT":
          records = (await resolveTxt(dto.domain)).map((chunks) => chunks.join(""));
          break;
        case "NS":
          records = await resolveNs(dto.domain);
          break;
        case "SOA": {
          const soa = await resolveSoa(dto.domain);
          records = [`${soa.nsname} ${soa.hostmaster} ${soa.serial} ${soa.refresh} ${soa.retry} ${soa.expire} ${soa.minttl}`];
          break;
        }
      }
    } catch {
      records = [];
    }

    return { domain: dto.domain, recordType: dto.recordType, records };
  }

  // ── IP Lookup (API.md: GET /net/ip-lookup) ───────────────────────────────
  // Uses ip-api.com's free, keyless tier (45 req/min, non-commercial use —
  // acceptable for this tool's rate-limited, low-volume usage per API.md
  // §12's 60/hour-per-user cap; documented here since it's a real external
  // dependency this tool relies on, not something to silently assume works
  // forever). The target host is fixed/trusted (not user-controlled), so
  // this call intentionally does NOT go through `safeFetch`/the SSRF guard
  // — that guard is for user-supplied URLs only.
  async ipLookup(dto: IpLookupDto, callerIp: string): Promise<IpLookupResult> {
    const ip = dto.ip?.trim() || callerIp;

    try {
      const response = await fetch(
        `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,org,timezone,query`,
        { signal: AbortSignal.timeout(5_000) },
      );
      const data = (await response.json()) as {
        status: string;
        country?: string;
        regionName?: string;
        city?: string;
        org?: string;
        timezone?: string;
        query?: string;
      };

      if (data.status !== "success") {
        return { ip };
      }

      return {
        ip: data.query ?? ip,
        city: data.city,
        region: data.regionName,
        country: data.country,
        org: data.org,
        timezone: data.timezone,
      };
    } catch {
      // Geolocation is best-effort — a failed lookup still returns the IP
      // itself rather than erroring the whole request.
      return { ip };
    }
  }

  // ── Webhook Tester (API.md: POST /net/webhook-inbox, GET .../events) ────
  /** `originUrl` is the full scheme+host the caller reached us on (built by
   * the controller from the request, since the service layer has no
   * request context) — used to hand back an absolute, paste-into-a-third-
   * -party-webhook-config URL rather than a bare path. */
  async createWebhookInbox(originUrl: string): Promise<WebhookInboxCreateResultDto> {
    const id = randomUUID();
    const key = webhookInboxKey(id);
    // Store a placeholder so `getWebhookEvents` can distinguish "inbox
    // exists but is empty" from "inbox never existed/expired".
    await this.redis.set(webhookInboxMetaKey(id), "1", "EX", WEBHOOK_INBOX_TTL_SECONDS);
    await this.redis.del(key); // in case of (astronomically unlikely) UUID reuse

    return {
      id,
      inboxUrl: `${originUrl}/v1/net/webhook-inbox/${id}/capture`,
      expiresAt: Date.now() + WEBHOOK_INBOX_TTL_SECONDS * 1000,
    };
  }

  async captureWebhookEvent(id: string, event: Omit<WebhookInboxEvent, "id" | "receivedAt">): Promise<boolean> {
    const exists = await this.redis.exists(webhookInboxMetaKey(id));
    if (!exists) return false;

    const fullEvent: WebhookInboxEvent = { id: randomUUID(), receivedAt: Date.now(), ...event };
    const key = webhookInboxKey(id);
    await this.redis.rpush(key, JSON.stringify(fullEvent));
    await this.redis.ltrim(key, -WEBHOOK_MAX_EVENTS, -1);
    await this.redis.expire(key, WEBHOOK_INBOX_TTL_SECONDS);
    return true;
  }

  async getWebhookEvents(id: string): Promise<WebhookInboxEvent[] | null> {
    const exists = await this.redis.exists(webhookInboxMetaKey(id));
    if (!exists) return null;

    const raw = await this.redis.lrange(webhookInboxKey(id), 0, -1);
    return raw.map((entry) => JSON.parse(entry) as WebhookInboxEvent);
  }

  // ── URL/Meta Tag Previewer (API.md: POST /net/url-preview) ──────────────
  async urlPreview(dto: UrlPreviewDto): Promise<UrlPreviewResult> {
    try {
      const response = await safeFetch(dto.url, {
        method: "GET",
        headers: { Accept: "text/html" },
        timeoutMs: 8_000,
      });
      const { text } = await readBodyWithCap(response, 500_000); // meta tags live in <head>, don't need the whole page
      const $ = cheerio.load(text);
      const safeUrl = await assertUrlIsSafe(dto.url); // re-validated URL object for resolving relative favicon/image paths

      const og = (prop: string) => $(`meta[property="${prop}"]`).attr("content");
      const meta = (name: string) => $(`meta[name="${name}"]`).attr("content");

      const faviconHref = $('link[rel="icon"], link[rel="shortcut icon"]').first().attr("href");

      return {
        url: dto.url,
        title: og("og:title") ?? ($("title").first().text() || undefined),
        description: og("og:description") ?? meta("description") ?? undefined,
        image: resolveMaybeRelative(og("og:image"), safeUrl),
        siteName: og("og:site_name") ?? undefined,
        favicon: resolveMaybeRelative(faviconHref, safeUrl) ?? new URL("/favicon.ico", safeUrl).toString(),
      };
    } catch (err) {
      if (err instanceof SsrfBlockedError) throw err;
      return { url: dto.url };
    }
  }
}

function webhookInboxKey(id: string): string {
  return `webhook-inbox:${id}:events`;
}
function webhookInboxMetaKey(id: string): string {
  return `webhook-inbox:${id}:meta`;
}

function resolveMaybeRelative(href: string | undefined, base: URL): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}

/** Reads a Response body up to `maxBytes`, aborting the read (not just
 * truncating after the fact) once the cap is hit so a malicious/huge
 * response can't consume unbounded server memory/time. */
async function readBodyWithCap(response: Response, maxBytes: number): Promise<{ text: string; truncated: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", truncated: false };

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        truncated = true;
        reader.cancel().catch(() => undefined);
        break;
      }
      chunks.push(value);
    }
  }

  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: buffer.toString("utf-8"), truncated };
}
