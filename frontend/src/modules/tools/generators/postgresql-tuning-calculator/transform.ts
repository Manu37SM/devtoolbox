import type { TransformResult } from "@/lib/tool-transform";
import type { PostgresqlTuningCalculatorOptions } from "./schema";

type Opts = PostgresqlTuningCalculatorOptions;
type DbType = Opts["dbType"];

const KB = 1;
const MB = 1024 * KB;
const GB = 1024 * MB;

export const DEFAULT_CONNECTIONS: Record<DbType, number> = { web: 200, oltp: 300, dw: 40, desktop: 20, mixed: 100 };
const WORK_MEM_DIVISOR: Record<DbType, number> = { web: 1, oltp: 1, dw: 2, desktop: 6, mixed: 2 };
const WAL: Record<DbType, [number, number]> = {
  web: [1 * GB, 4 * GB],
  oltp: [2 * GB, 8 * GB],
  dw: [4 * GB, 16 * GB],
  desktop: [100 * MB, 2 * GB],
  mixed: [1 * GB, 4 * GB],
};
const RANDOM_PAGE_COST = { ssd: 1.1, hdd: 4, san: 1.1 } as const;
const IO_CONCURRENCY = { ssd: 200, hdd: 2, san: 300 } as const;

/** Formats a kB count the way postgresql.conf is normally written. */
export function fmtKb(kb: number): string {
  const v = Math.floor(kb);
  if (v % GB === 0 && v >= GB) return `${v / GB}GB`;
  if (v % MB === 0 && v >= MB) return `${v / MB}MB`;
  return `${v}kB`;
}

export interface Setting {
  key: string;
  value: string;
  /** Short note on how it was derived */
  why: string;
  /** Needs a server restart rather than a reload */
  restart?: boolean;
}

export function computeSettings(o: Opts): Setting[] {
  const ramKb = Math.floor(o.ram * (o.ramUnit === "GB" ? GB : MB));
  const conns = o.maxConnections > 0 ? o.maxConnections : DEFAULT_CONNECTIONS[o.dbType];
  const out: Setting[] = [];

  out.push({ key: "max_connections", value: String(conns), why: o.maxConnections > 0 ? "your value" : `default for ${o.dbType} workloads; use a pooler (PgBouncer) before raising it`, restart: true });

  const shared = o.dbType === "desktop" ? Math.floor(ramKb / 16) : Math.floor(ramKb / 4);
  out.push({ key: "shared_buffers", value: fmtKb(shared), why: o.dbType === "desktop" ? "RAM / 16 (desktop)" : "RAM / 4", restart: true });

  const cache = o.dbType === "desktop" ? Math.floor(ramKb / 4) : Math.floor((ramKb * 3) / 4);
  out.push({ key: "effective_cache_size", value: fmtKb(cache), why: o.dbType === "desktop" ? "RAM / 4 (desktop)" : "RAM x 3/4: a planner hint, not an allocation" });

  let maint = o.dbType === "dw" ? Math.floor(ramKb / 8) : Math.floor(ramKb / 16);
  maint = Math.min(maint, 2 * GB);
  out.push({ key: "maintenance_work_mem", value: fmtKb(maint), why: `${o.dbType === "dw" ? "RAM / 8" : "RAM / 16"}, capped at 2GB` });

  out.push({ key: "checkpoint_completion_target", value: "0.9", why: "spread checkpoint writes over 90% of the interval" });

  let walBuf = Math.floor((3 * shared) / 100);
  const maxWalBuf = 16 * MB;
  if (walBuf > maxWalBuf) walBuf = maxWalBuf;
  if (walBuf > 14 * MB && walBuf < maxWalBuf) walBuf = maxWalBuf;
  if (walBuf < 32 * KB) walBuf = 32 * KB;
  out.push({ key: "wal_buffers", value: fmtKb(walBuf), why: "3% of shared_buffers, between 32kB and 16MB", restart: true });

  out.push({ key: "default_statistics_target", value: o.dbType === "dw" ? "500" : "100", why: o.dbType === "dw" ? "larger histograms help analytic plans" : "PostgreSQL default" });
  out.push({ key: "random_page_cost", value: String(RANDOM_PAGE_COST[o.storage]), why: `${o.storage.toUpperCase()} storage` });
  out.push({ key: "effective_io_concurrency", value: String(IO_CONCURRENCY[o.storage]), why: `${o.storage.toUpperCase()} storage (Linux)` });

  // parallelism
  let perGather = 0;
  const parallel = o.cpus >= 4;
  if (parallel) {
    perGather = Math.ceil(o.cpus / 2);
    if (o.dbType !== "dw" && perGather > 4) perGather = 4;
    out.push({ key: "max_worker_processes", value: String(o.cpus), why: "one per CPU", restart: true });
    out.push({ key: "max_parallel_workers_per_gather", value: String(perGather), why: o.dbType === "dw" ? "CPUs / 2" : "CPUs / 2, at most 4" });
    out.push({ key: "max_parallel_workers", value: String(o.cpus), why: "one per CPU" });
    if (o.version >= 11) {
      out.push({ key: "max_parallel_maintenance_workers", value: String(Math.min(4, Math.ceil(o.cpus / 2))), why: "CPUs / 2, at most 4" });
    }
  }

  // work_mem
  const parallelWorkers = parallel ? o.cpus : 0;
  let work = Math.floor((ramKb - shared) / ((conns + parallelWorkers) * 3));
  work = Math.floor(work / WORK_MEM_DIVISOR[o.dbType]);
  if (work < 64) work = 64;
  out.push({ key: "work_mem", value: fmtKb(work), why: `(RAM - shared_buffers) / ((connections + parallel workers) x 3)${WORK_MEM_DIVISOR[o.dbType] > 1 ? ` / ${WORK_MEM_DIVISOR[o.dbType]}` : ""}; per sort or hash node, per connection` });

  out.push({ key: "huge_pages", value: ramKb >= 32 * GB ? "try" : "off", why: ramKb >= 32 * GB ? "32GB or more: transparent huge pages cost TLB misses" : "under 32GB", restart: true });

  const [minWal, maxWal] = WAL[o.dbType];
  out.push({ key: "min_wal_size", value: fmtKb(minWal), why: `${o.dbType} workload` });
  out.push({ key: "max_wal_size", value: fmtKb(maxWal), why: `${o.dbType} workload; larger means fewer forced checkpoints, longer crash recovery` });

  return out;
}

export function extraSettings(o: Opts): Setting[] {
  const s: Setting[] = [
    { key: "shared_preload_libraries", value: "'pg_stat_statements'", why: "query statistics; then CREATE EXTENSION pg_stat_statements", restart: true },
    { key: "log_min_duration_statement", value: o.dbType === "dw" ? "5s" : "500ms", why: "log slow statements" },
    { key: "log_checkpoints", value: "on", why: "see checkpoint frequency and write time" },
    { key: "log_lock_waits", value: "on", why: "log waits longer than deadlock_timeout" },
    { key: "log_temp_files", value: "0", why: "every temp file means work_mem was too small for some query" },
    { key: "autovacuum_vacuum_scale_factor", value: o.dbType === "oltp" || o.dbType === "web" ? "0.05" : "0.1", why: "vacuum busy tables earlier than the 20% default" },
    { key: "autovacuum_analyze_scale_factor", value: "0.05", why: "keep statistics fresh" },
    { key: "idle_in_transaction_session_timeout", value: o.dbType === "dw" || o.dbType === "desktop" ? "0" : "60s", why: "idle transactions hold back vacuum and keep locks" },
  ];
  if (o.dbType === "oltp" || o.dbType === "web") s.push({ key: "jit", value: "off", why: "JIT compile time rarely pays off for short queries" });
  return s;
}

function dockerQuote(v: string): string {
  return /^[A-Za-z0-9_.-]+$/.test(v) ? v : `"${v.replace(/"/g, '\\"')}"`;
}

export function postgresqlTuningCalculator(_input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    ram: options.ram ?? 16,
    ramUnit: options.ramUnit ?? "GB",
    cpus: options.cpus ?? 4,
    dbType: options.dbType ?? "web",
    storage: options.storage ?? "ssd",
    version: options.version ?? 16,
    maxConnections: options.maxConnections ?? 0,
    format: options.format ?? "conf",
    extras: options.extras ?? true,
    explain: options.explain ?? true,
  };
  if (!(o.ram > 0) || !Number.isFinite(o.ram)) return { output: "", error: { message: "RAM must be a positive number" } };
  const ramMb = o.ramUnit === "GB" ? o.ram * 1024 : o.ram;
  if (ramMb < 256) return { output: "", error: { message: "Less than 256MB of RAM is below what these heuristics support" } };
  const base = computeSettings(o);
  const extras = o.extras ? extraSettings(o) : [];
  const all = [...base, ...extras];
  const restarts = all.filter((s) => s.restart).map((s) => s.key);
  const summary = `# DB version: ${o.version}\n# Workload: ${o.dbType}\n# Total memory: ${o.ram}${o.ramUnit}\n# CPUs: ${o.cpus}\n# Storage: ${o.storage}`;
  let out: string;
  switch (o.format) {
    case "alter-system":
      out = all.map((s) => `ALTER SYSTEM SET ${s.key} = ${/^'/.test(s.value) || /^[0-9.]+$/.test(s.value) ? s.value : `'${s.value}'`};`).join("\n") + "\nSELECT pg_reload_conf();";
      if (restarts.length) out += `\n-- restart required for: ${restarts.join(", ")}`;
      break;
    case "docker":
      out = "postgres \\\n" + all.map((s) => `  -c ${s.key}=${dockerQuote(s.value.replace(/^'(.*)'$/, "$1"))}`).join(" \\\n");
      break;
    case "json":
      out = JSON.stringify(Object.fromEntries(all.map((s) => [s.key, s.value.replace(/^'(.*)'$/, "$1")])), null, 2);
      break;
    default: {
      const width = Math.max(...all.map((s) => s.key.length));
      const line = (s: Setting) => `${s.key.padEnd(width)} = ${s.value}${o.explain ? `   # ${s.why}${s.restart ? " (restart)" : ""}` : ""}`;
      out = `${summary}\n\n${base.map(line).join("\n")}${extras.length ? `\n\n# monitoring and housekeeping\n${extras.map(line).join("\n")}` : ""}`;
    }
  }
  return { output: out, error: null };
}
