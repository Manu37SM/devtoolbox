import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const postgresqlTuningCalculatorTool: ToolRegistryEntry = {
  slug: "postgresql-tuning-calculator",
  name: "PostgreSQL Memory & Tuning Calculator",
  module: "generators",
  description: "Derive postgresql.conf settings from RAM, CPUs, storage, workload and version: shared_buffers, work_mem, WAL sizing, planner costs and parallel workers, as conf lines, ALTER SYSTEM or docker flags.",
  aliases: ["pgtune", "postgresql.conf", "shared_buffers", "work_mem", "postgres tuning", "max_connections", "effective_cache_size"],
  icon: "Gauge",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["postgresql memory & tuning calculator", "pgtune", "postgresql.conf", "shared_buffers", "work_mem", "postgres tuning", "max_connections", "effective_cache_size"] },
};
