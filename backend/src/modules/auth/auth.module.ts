import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { EmailService } from "./email.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";

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
  ],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, OAuthService, EmailService, JwtAccessStrategy],
  exports: [AuthService],
})
export class AuthModule {}
