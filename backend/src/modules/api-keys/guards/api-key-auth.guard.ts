import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ApiKeysService } from "../api-keys.service";

/**
 * Guards §12 Public API routes. Reads `Authorization: Bearer <api key>`
 * (same header shape as JwtAuthGuard, different token type — a raw API key,
 * not a JWT) and validates it via ApiKeysService, which also enforces the
 * PRO/TEAM plan gate. Populates `req.user = { userId, email }` in the same
 * shape JwtAccessStrategy does, so `PlanThrottleGuard` composes after this
 * guard exactly like it does on session-authed routes — put
 * `@UseGuards(ApiKeyAuthGuard, PlanThrottleGuard)` in that order.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: { userId: string; email: string } }>();
    const header = req.headers.authorization;
    const rawKey = header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : undefined;

    if (!rawKey) {
      throw new UnauthorizedException("Missing API key.");
    }

    const principal = await this.apiKeysService.validateKey(rawKey);
    req.user = { userId: principal.userId, email: principal.email };
    return true;
  }
}
