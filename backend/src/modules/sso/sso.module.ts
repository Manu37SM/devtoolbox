import { Module } from "@nestjs/common";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [SsoController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
