import { Module } from "@nestjs/common";
import { PluginsController } from "./plugins.controller";
import { PluginsService } from "./plugins.service";

/** Plugin marketplace v1 — API.md §18, ARCHITECTURE.md §16. */
@Module({
  controllers: [PluginsController],
  providers: [PluginsService],
  exports: [PluginsService],
})
export class PluginsModule {}
