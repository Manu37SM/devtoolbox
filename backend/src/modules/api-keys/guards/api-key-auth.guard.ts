import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { ApiKeysService } from "../api-keys.service";

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
