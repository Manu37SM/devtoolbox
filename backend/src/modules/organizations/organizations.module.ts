import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";

/** Team workspaces — API.md §17, ARCHITECTURE.md §14.2. */
@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
