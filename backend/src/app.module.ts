import { Module } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { SyncModule } from "./modules/sync/sync.module";
import { ShareModule } from "./modules/share/share.module";
import { AiGatewayModule } from "./modules/ai-gateway/ai-gateway.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ConfigModule } from "./config/config.module";

/**
 * Root module. Each feature module owns its own controller/service/DTO
 * layer with no cross-module direct DB access — see ARCHITECTURE.md §8.3.
 * Rate limiting (ThrottlerModule) applies globally; per-route overrides
 * live in API.md §12's limits via @Throttle() decorators per module.
 */
@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    AuthModule,
    UsersModule,
    SyncModule,
    ShareModule,
    AiGatewayModule,
    AnalyticsModule,
    AdminModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
