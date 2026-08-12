import { Module } from "@nestjs/common";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";
import { AuthModule } from "../auth/auth.module";

/** Org-level SSO — API.md §17.5, AUDIT_REPORT.md §23. Imports AuthModule
 * for its exported AuthService (session issuance) — SsoService reuses
 * `createSession`/`buildAuthResponse` exactly like OAuthService does,
 * rather than a parallel session-issuance path. */
@Module({
  imports: [AuthModule],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
