import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { AuthModule } from "../auth/auth.module";

/** Team workspaces — API.md §17, ARCHITECTURE.md §14.2. Imports AuthModule
 * for its exported EmailService (invite emails, AUDIT_REPORT.md §21) —
 * JwtAuthGuard is imported directly by the controller and doesn't need the
 * module import for that part. */
@Module({
  imports: [AuthModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
