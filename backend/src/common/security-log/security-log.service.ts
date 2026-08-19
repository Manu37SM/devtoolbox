import { Injectable, Logger } from "@nestjs/common";
import type { Prisma, SecurityEventType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { hashIp } from "../crypto/token-hash";

/**
 * Checklist item #38 — security event logging. Before this, only 5xx
 * exceptions reached Sentry (GlobalExceptionFilter); failed logins, account
 * lockouts, password resets, and admin actions were invisible.
 *
 * Persists to SecurityEventLog (see prisma/schema.prisma) for durable,
 * queryable history, and also emits a structured console log line so the
 * event shows up in whatever the deploy platform's log aggregation is
 * (Render's log stream) without waiting on a DB round trip to debug an
 * incident. Never logs tool input/output content — only event type, actor
 * identifiers (userId, hashed IP, user-agent), and small non-content
 * metadata, per CLAUDE.md rule 8.
 *
 * Best-effort: a failure to write the audit row must never fail the
 * request that triggered it (e.g. a DB hiccup shouldn't block login), so
 * write errors are caught and logged, not rethrown.
 */
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
