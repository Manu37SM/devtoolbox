import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";

/**
 * Favorites + History — the opt-in cross-device sync surface. See API.md
 * §4-5, DATABASE.md. Snippets and Pipelines are their own modules
 * (src/modules/snippets, src/modules/pipelines) despite being adjacent in
 * API.md §6-7 — different enough shapes (nested steps, public sharing)
 * that splitting them out kept each service focused.
 */
@Module({
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
