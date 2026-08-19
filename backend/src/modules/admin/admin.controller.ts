import { Controller } from "@nestjs/common";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Routes implemented per API.md. Kept empty during the planning phase -
  // see AUDIT_REPORT.md for phase status.
  //
  // Verified 2026-08-19 (checklist item #36, "remove default admin
  // routes"): this controller currently has zero routes, so there is
  // nothing unguarded to reach — no fix needed today. When routes are
  // added here, they MUST be gated on `User.isAdmin` (see prisma/schema.prisma's
  // User.isAdmin doc comment) via a dedicated guard (an `AdminGuard`
  // checking `req.user.isAdmin`, composed with JwtAuthGuard the same way
  // other guarded controllers in this codebase compose guards) — do not
  // ship a route here without it.
}
