import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * Internal admin endpoints (usage dashboards, user support lookups). role=admin only. See API.md section 11.
 *
 * Scaffolding only - planning phase. Business logic to be implemented per
 * the module's section of API.md during the corresponding roadmap phase
 * (see FEATURE.md "Phased Roadmap").
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
