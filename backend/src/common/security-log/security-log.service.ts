import { Injectable, Logger } from "@nestjs/common";
import type { Prisma, SecurityEventType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { hashIp } from "../crypto/token-hash";

@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: {
    type: SecurityEventType;
    userId?: string | null;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const ipHash = event.ip ? hashIp(event.ip) : null;

    this.logger.log(
      JSON.stringify({
        securityEvent: event.type,
        userId: event.userId ?? null,
        ipHash,
        ...event.metadata,
      }),
    );

    try {
      await this.prisma.securityEventLog.create({
        data: {
          type: event.type,
          userId: event.userId ?? null,
          ipHash,
          userAgent: event.userAgent?.slice(0, 500),
          metadata: (event.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to persist security event ${event.type}`, err instanceof Error ? err.stack : String(err));
    }
  }
}
