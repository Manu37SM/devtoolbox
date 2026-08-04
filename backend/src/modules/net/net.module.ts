import { Module } from "@nestjs/common";
import { NetController } from "./net.controller";
import { NetService } from "./net.service";
import { RedisModule } from "../../common/redis/redis.module";

@Module({
  imports: [RedisModule],
  controllers: [NetController],
  providers: [NetService],
})
export class NetModule {}
