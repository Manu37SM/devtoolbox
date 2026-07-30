import { Controller } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Routes implemented per API.md. Kept empty during the planning phase -
  // see AUDIT_REPORT.md for phase status.
}
