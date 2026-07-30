import { Controller } from "@nestjs/common";
import { AiGatewayService } from "./ai-gateway.service";

@Controller("ai-gateway")
export class AiGatewayController {
  constructor(private readonly aiGatewayService: AiGatewayService) {}

  // Routes implemented per API.md. Kept empty during the planning phase -
  // see AUDIT_REPORT.md for phase status.
}
