import { Module } from "@nestjs/common";
import { SecurityLogService } from "./security-log.service";

@Module({
  providers: [SecurityLogService],
  exports: [SecurityLogService],
})
export class SecurityLogModule {}
