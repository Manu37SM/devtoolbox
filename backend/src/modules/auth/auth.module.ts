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

  exports: [AuthService, EmailService],
})
export class AuthModule implements NestModule {

  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(doubleCsrfProtection)
      .forRoutes(
        { path: "auth/refresh", method: RequestMethod.POST },
        { path: "auth/logout", method: RequestMethod.POST },
      );
  }
}
