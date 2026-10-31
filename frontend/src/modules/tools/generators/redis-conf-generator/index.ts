import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const redisConfGeneratorTool: ToolRegistryEntry = {
  slug: "redis-conf-generator",
  name: "Redis Config (redis.conf) Generator",
  module: "generators",
  description: "Generate a redis.conf from cache, session, queue or durable-store presets: memory limits and eviction, RDB and AOF persistence, ACL user, TLS, replication, IO threads and command hardening.",
  aliases: ["redis.conf", "redis config", "redis eviction", "redis aof", "redis acl", "redis persistence config"],
  icon: "Database",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["redis config (redis.conf) generator", "redis.conf", "redis config", "redis eviction", "redis aof", "redis acl", "redis persistence config"] },
};
