import { z } from "zod";

export const redisConfGeneratorOptionsSchema = z.object({
  /** Starting point: sets eviction and persistence defaults, everything else below can override */
  preset: z.enum(["cache", "session", "queue", "durable", "custom"]).default("cache"),
  bind: z.string().default("127.0.0.1 -::1"),
  port: z.number().int().min(0).max(65535).default(6379),
  protectedMode: z.boolean().default(true),
  unixSocket: z.string().default(""),
  /** requirepass for the default user; empty leaves it unset */
  requirePass: z.string().default(""),
  /** Create a restricted ACL user for the application and switch the default user off */
  aclUser: z.string().default(""),
  aclPassword: z.string().default(""),
  aclKeyPattern: z.string().default("app:*"),
  /** Store the ACL password as a SHA-256 hash (#hex) instead of plain text */
  aclHashPassword: z.boolean().default(true),
  maxMemory: z.string().default("256mb"),
  /** auto = decided by the preset */
  evictionPolicy: z.enum(["auto", "noeviction", "allkeys-lru", "volatile-lru", "allkeys-lfu", "volatile-lfu", "allkeys-random", "volatile-random", "volatile-ttl"]).default("auto"),
  persistence: z.enum(["auto", "none", "rdb", "aof", "rdb+aof"]).default("auto"),
  aofFsync: z.enum(["everysec", "always", "no"]).default("everysec"),
  rdbSave: z.string().default("3600 1 300 100 60 10000"),
  replicaOf: z.string().default(""),
  masterAuth: z.string().default(""),
  tlsPort: z.number().int().min(0).max(65535).default(0),
  tlsCert: z.string().default("/etc/redis/tls/redis.crt"),
  tlsKey: z.string().default("/etc/redis/tls/redis.key"),
  tlsCa: z.string().default("/etc/redis/tls/ca.crt"),
  maxClients: z.number().int().min(0).max(1000000).default(10000),
  timeout: z.number().int().min(0).max(86400).default(0),
  databases: z.number().int().min(1).max(1024).default(16),
  ioThreads: z.number().int().min(1).max(16).default(1),
  lazyFree: z.boolean().default(true),
  activeDefrag: z.boolean().default(false),
  /** Comma separated command names to disable with rename-command NAME "" */
  disableCommands: z.string().default(""),
  slowlog: z.boolean().default(true),
  keyspaceEvents: z.string().default(""),
  dir: z.string().default("/var/lib/redis"),
  logLevel: z.enum(["debug", "verbose", "notice", "warning"]).default("notice"),
  logFile: z.string().default(""),
  comments: z.boolean().default(true),
});
export type RedisConfGeneratorOptions = z.infer<typeof redisConfGeneratorOptionsSchema>;
