import { Module } from "@nestjs/common";
import { AiGatewayController } from "./ai-gateway.controller";
import { AiGatewayService } from "./ai-gateway.service";

/**
 * Task-specific AI endpoints (explain, generate, diff-summary, json-repair)
 * proxying to the Anthropic API, plus GET /ai/usage. See API.md §9,
 * ARCHITECTURE.md §8.3, CLAUDE.md rule 7.
 */
@Module({
  controllers: [AiGatewayController],
  providers: [AiGatewayService],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
