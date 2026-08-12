import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

/** Liveness/readiness probe for Render (render.yaml's `healthCheckPath`)
 * and any future load balancer/uptime monitor. Deliberately outside every
 * other module's auth/rate-limit stack — a health check that itself needed
 * a session or could get 429'd during a traffic spike would defeat the
 * purpose. No tool content, no user data — just "is this instance alive
 * and can it reach Postgres." See AUDIT_REPORT.md §24/§25. */
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database unreachable.");
    }
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
