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
  UseGuards,
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
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { PlanThrottle } from "../../common/rate-limit/plan-throttle.decorator";
import { PlanThrottleGuard } from "../../common/rate-limit/plan-throttle.guard";

@Controller("net")
export class NetController {
  constructor(private readonly netService: NetService) {}

  @PlanThrottle({
    route: "net-http-request",
    anonymous: { limit: 10, ttlSeconds: 3_600 },
    free: { limit: 60, ttlSeconds: 3_600 },
    pro: { limit: 500, ttlSeconds: 3_600 },
  })
  @UseGuards(OptionalJwtAuthGuard, PlanThrottleGuard)
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
