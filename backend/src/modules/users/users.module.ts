import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

/**
 * Current-user profile, account deletion, data export. See API.md section 3.
 *
 * Scaffolding only - planning phase. Business logic to be implemented per
 * the module's section of API.md during the corresponding roadmap phase
 * (see FEATURE.md "Phased Roadmap").
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
