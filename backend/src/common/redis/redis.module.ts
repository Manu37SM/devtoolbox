import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: 3 }),
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
