import { Module } from "@nestjs/common";
import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";

/**
 * Task-specific AI endpoints (explain, generate, diff-summary, json-repair) proxying to the Anthropic API. See API.md section 9, ARCHITECTURE.md section 8.3, CLAUDE.md rule 7.
 *
 * Scaffolding only - planning phase. Business logic to be implemented per
 * the module's section of API.md during the corresponding roadmap phase
 * (see FEATURE.md "Phased Roadmap").
 */
@Module({
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
