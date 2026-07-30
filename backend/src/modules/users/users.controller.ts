import { Controller } from "@nestjs/common";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Routes implemented per API.md. Kept empty during the planning phase -
  // see AUDIT_REPORT.md for phase status.
}
