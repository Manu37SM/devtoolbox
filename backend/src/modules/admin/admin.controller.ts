import { Controller } from "@nestjs/common";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Routes implemented per API.md. Kept empty during the planning phase -
  // see AUDIT_REPORT.md for phase status.
}
