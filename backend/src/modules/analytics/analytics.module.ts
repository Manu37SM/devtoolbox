import { Module } from "@nestjs/common";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

/**
 * Aggregate, privacy-respecting usage analytics ingestion. Never stores tool input/output content. See ARCHITECTURE.md privacy NFR, DEVELOPMENT_GUIDE.md section 8.
 *
 * Scaffolding only - planning phase. Business logic to be implemented per
 * the module's section of API.md during the corresponding roadmap phase
 * (see FEATURE.md "Phased Roadmap").
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
