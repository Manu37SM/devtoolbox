import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";
import { SecurityLogModule } from "../../common/security-log/security-log.module";
import { CaptchaModule } from "../../common/captcha/captcha.module";
import { doubleCsrfProtection } from "../../common/csrf/csrf";

/**
 * Registration, login, OAuth, JWT access/refresh token issuance and
 * rotation. See API.md §2, ARCHITECTURE.md §9. Security-sensitive per
 * CLAUDE.md rule 6 — cross-reference those docs before changing anything
 * here (ownership checks, rate limiting, no plaintext secret persistence).
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      }),
    }),
    SecurityLogModule,
    CaptchaModule,
  ],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService, EmailService, JwtAccessStrategy],
  // EmailService exported so other modules with their own transactional
  // email needs (OrganizationsModule's invite emails) reuse this one
  // Resend-backed instance instead of standing up a second one.
  exports: [AuthService, EmailService],
})
export class AuthModule implements NestModule {
  // CSRF protection (checklist item #22) scoped to just the two
  // cookie-authenticated, state-changing routes — see csrf.ts's doc
  // comment for why this isn't applied API-wide.
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(doubleCsrfProtection)
      .forRoutes(
        { path: "auth/refresh", method: RequestMethod.POST },
        { path: "auth/logout", method: RequestMethod.POST },
      );
  }
}
