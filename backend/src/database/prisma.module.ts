import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/** @Global so any module can inject PrismaService without re-importing —
 * same pattern as RedisModule (src/common/redis/redis.module.ts). */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
