import { Module } from "@nestjs/common";
import { PipelinesController } from "./pipelines.controller";
import { PipelinesService } from "./pipelines.service";

/** Server-synced pipelines, optionally public, duplicable — API.md §7. */
@Module({
  controllers: [PipelinesController],
  providers: [PipelinesService],
})
export class PipelinesModule {}
