import {
  All,
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import {
  DnsLookupSchema,
  HttpRequestProxySchema,
  IpLookupSchema,
  UrlPreviewSchema,
  type WebhookInboxEvent,
} from "@devtoolbox/shared";
import { NetService } from "./net.service";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { SsrfBlockedError } from "../../common/net/ssrf-guard";

/**
 * Module 8 server-proxied network tools — see API.md §10 and
 * ARCHITECTURE.md §8.4 (tier 2: "server-assisted, ephemeral"). Every route
 * here exists ONLY because the underlying operation can't run client-side
 * (CORS for HTTP Request Tester/URL Previewer, DNS resolution, IP
 * disclosure, or receiving genuinely inbound webhook traffic) — this is
 * the documented, deliberate exception to CLAUDE.md rule 1's "client-side
 * by default," not a rule violation.
 */
@Controller("net")
export class NetController {
  constructor(private readonly netService: NetService) {}

  // Rate limit per API.md §12: 10/hour/IP anonymous. `@Throttle` overrides
  // the global 300/min default set in AppModule for this route only.
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  @Post("http-request")
  async httpRequest(@Body(new ZodValidationPipe(HttpRequestProxySchema)) dto: unknown) {
    try {
      return await this.netService.proxyHttpRequest(dto as Parameters<NetService["proxyHttpRequest"]>[0]);
    } catch (err) {
      if (err instanceof SsrfBlockedError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  @Get("dns")
  async dns(@Query(new ZodValidationPipe(DnsLookupSchema)) dto: unknown) {
    return this.netService.dnsLookup(dto as Parameters<NetService["dnsLookup"]>[0]);
  }

  @Get("ip-lookup")
  async ipLookup(@Query(new ZodValidationPipe(IpLookupSchema)) dto: unknown, @Req() req: Request) {
    const callerIp = req.ip ?? req.socket.remoteAddress ?? "";
    return this.netService.ipLookup(dto as Parameters<NetService["ipLookup"]>[0], callerIp);
  }

  @Post("webhook-inbox")
  @HttpCode(201)
  async createWebhookInbox(@Req() req: Request) {
    const originUrl = `${req.protocol}://${req.get("host")}`;
    return this.netService.createWebhookInbox(originUrl);
  }

  @Get("webhook-inbox/:id/events")
  async getWebhookEvents(@Param("id") id: string) {
    const events = await this.netService.getWebhookEvents(id);
    if (events === null) {
      throw new NotFoundException("This inbox doesn't exist or has expired.");
    }
    return { events };
  }

  // The actual public inbox URL a user pastes into a third-party
  // webhook-sender config — must accept every HTTP method and any
  // content-type, so this is deliberately NOT behind Zod body validation
  // (the whole point is capturing whatever an external service sends).
  // No @Throttle override: inbound webhook traffic volume is the point of
  // the tool, capped instead by WEBHOOK_MAX_EVENTS in the service and the
  // inbox's own 30-minute TTL.
  @All("webhook-inbox/:id/capture")
  async captureWebhookEvent(@Param("id") id: string, @Req() req: Request) {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers[key] = value;
    }

    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") query[key] = value;
    }

    const body =
      typeof req.body === "string" ? req.body : req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";

    const captured = await this.netService.captureWebhookEvent(id, {
      method: req.method,
      headers,
      body,
      query,
    } satisfies Omit<WebhookInboxEvent, "id" | "receivedAt">);

    if (!captured) {
      throw new NotFoundException("This inbox doesn't exist or has expired.");
    }
    return { ok: true };
  }

  @Throttle({ default: { limit: 60, ttl: 3_600_000 } })
  @Post("url-preview")
  async urlPreview(@Body(new ZodValidationPipe(UrlPreviewSchema)) dto: unknown) {
    try {
      return await this.netService.urlPreview(dto as Parameters<NetService["urlPreview"]>[0]);
    } catch (err) {
      if (err instanceof SsrfBlockedError) throw new BadRequestException(err.message);
      throw err;
    }
  }
}
