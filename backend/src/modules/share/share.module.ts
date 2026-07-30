import { Module } from "@nestjs/common";
import { ShareController } from "./share.controller";
import { ShareService } from "./share.service";

/**
 * Short share links for tool state. See API.md section 8, DATABASE.md ShareLink model.
 *
 * Scaffolding only - planning phase. Business logic to be implemented per
 * the module's section of API.md during the corresponding roadmap phase
 * (see FEATURE.md "Phased Roadmap").
 */
@Module({
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
