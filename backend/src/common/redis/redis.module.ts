import { Global, Module } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

/** Single shared ioredis client, used for anything needing transient
 * server-side state (webhook inbox capture, future rate-limit/session
 * state per ARCHITECTURE.md §8.3) — not BullMQ (that's for background
 * jobs, a different use case; this is plain key/value with TTL). `@Global`
 * so any module can inject `REDIS_CLIENT` without re-importing this
 * module everywhere. */
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
