import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtAccessPayload {
  sub: string; // userId
  email: string;
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
}

/** Validates the short-lived (15min) JWT access token sent as
 * `Authorization: Bearer <token>` per ARCHITECTURE.md §9. Refresh tokens
 * are a separate, opaque, httpOnly-cookie mechanism handled directly in
 * AuthService — not a passport strategy — since rotation/reuse-detection
 * needs custom DB lookups, not just signature verification. */
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  validate(payload: JwtAccessPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
