import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

/**
 * Transactional email sender for the verify-email / password-reset flows.
 * Uses Resend (https://resend.com) when `RESEND_API_KEY` is configured;
 * falls back to logging the link to the server console otherwise, so dev
 * environments and the sandbox test suite keep working with zero setup.
 * This was previously console-only unconditionally — see CHANGELOG.md's
 * Phase 3 production-readiness entry for why Resend specifically (simple
 * REST API, generous free tier, no provider named in ARCHITECTURE.md's
 * stack to defer to instead).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = this.config.get<string>("EMAIL_FROM") ?? "DevToolbox <noreply@devtoolbox.dev>";

    if (!this.resend) {
      this.logger.warn(
        "RESEND_API_KEY is not set — verification/reset emails will be logged to this console instead of actually sent. Fine for local dev, not for production.",
      );
    }
  }

  async sendVerificationEmail(to: string, link: string): Promise<void> {
    await this.send(to, "Verify your DevToolbox account", verificationEmailHtml(link), `Verify your DevToolbox account: ${link}`);
  }

  async sendPasswordResetEmail(to: string, link: string): Promise<void> {
    await this.send(to, "Reset your DevToolbox password", passwordResetEmailHtml(link), `Reset your DevToolbox password: ${link}`);
  }

  /** Team workspace invites (AUDIT_REPORT.md §21) — same "log to console
   * without RESEND_API_KEY" degrade path as every other email here. */
  async sendOrgInviteEmail(to: string, organizationName: string, link: string): Promise<void> {
    await this.send(
      to,
      `You've been invited to join ${organizationName} on DevToolbox`,
      orgInviteEmailHtml(organizationName, link),
      `You've been invited to join ${organizationName} on DevToolbox: ${link}`,
    );
  }

  private async send(to: string, subject: string, html: string, textFallback: string): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[dev email → ${to}] ${subject}: ${textFallback}`);
      return;
    }

    const result = await this.resend.emails.send({ from: this.fromAddress, to, subject, html });
    if (result.error) {
      // Deliberately doesn't throw: a failed email shouldn't fail the
      // register/reset-request request itself (both already return a
      // generic success response regardless — see auth.service.ts's
      // account-enumeration-safety comment on requestPasswordReset).
      // Logged loudly instead so it's visible in monitoring.
      this.logger.error(`Failed to send email to ${to}: ${result.error.message}`);
    }
  }
}

function verificationEmailHtml(link: string): string {
  return `<p>Welcome to DevToolbox. Click below to verify your email address:</p><p><a href="${link}">${link}</a></p><p>If you didn't create this account, you can ignore this email.</p>`;
}

function passwordResetEmailHtml(link: string): string {
  return `<p>Someone requested a password reset for your DevToolbox account.</p><p><a href="${link}">${link}</a></p><p>If this wasn't you, you can safely ignore this email — your password won't change unless you click the link above.</p>`;
}

// Org names are arbitrary user input (CreateOrganizationSchema, up to 80
// chars) — escaped before interpolating into HTML, unlike `link` above
// (always a same-origin FRONTEND_URL-prefixed URL this service built
// itself, never user-supplied).
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function orgInviteEmailHtml(organizationName: string, link: string): string {
  const safeName = escapeHtml(organizationName);
  return `<p>You've been invited to join <strong>${safeName}</strong> on DevToolbox.</p><p><a href="${link}">${link}</a></p><p>This link expires in 7 days. If you weren't expecting this, you can safely ignore it.</p>`;
}
