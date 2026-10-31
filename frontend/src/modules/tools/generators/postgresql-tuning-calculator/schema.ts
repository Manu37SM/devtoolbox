import { z } from "zod";

export const postgresqlTuningCalculatorOptionsSchema = z.object({
  ram: z.number().min(0.25).max(65536).default(16),
  ramUnit: z.enum(["MB", "GB"]).default("GB"),
  cpus: z.number().int().min(1).max(1024).default(4),
  dbType: z.enum(["web", "oltp", "dw", "desktop", "mixed"]).default("web"),
  storage: z.enum(["ssd", "hdd", "san"]).default("ssd"),
  version: z.number().int().min(12).max(18).default(16),
  /** 0 uses the workload default (web 200, oltp 300, dw 40, desktop 20, mixed 100) */
  maxConnections: z.number().int().min(0).max(10000).default(0),
  /** Output format */
  format: z.enum(["conf", "alter-system", "docker", "json"]).default("conf"),
  /** Add logging, pg_stat_statements and autovacuum basics */
  extras: z.boolean().default(true),
  /** Explain how each value was computed */
  explain: z.boolean().default(true),
});
export type PostgresqlTuningCalculatorOptions = z.infer<typeof postgresqlTuningCalculatorOptionsSchema>;
