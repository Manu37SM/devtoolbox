import { Injectable, Logger } from "@nestjs/common";

/**
 * Minimal email sender. No transactional-email provider (Resend/SES/etc.)
 * is wired into ARCHITECTURE.md's stack yet — this logs the link to the
 * server console so the verify-email / password-reset flows are fully
 * exercisable in dev without a real provider. Flagged in AUDIT_REPORT.md
 * as a follow-up: swap this implementation for a real provider before
 * Phase 3 ships to production; the interface below is deliberately the
 * only thing callers depend on, so that swap is a one-file change.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    this.logger.log(`[dev email → ${to}] Verify your DevToolbox account: ${link}`);
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    this.logger.log(`[dev email → ${to}] Reset your DevToolbox password: ${link}`);
  }
}
