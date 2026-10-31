import { describe, expect, it } from "vitest";
import { computeSettings, fmtKb, postgresqlTuningCalculator as fn } from "./transform";
import { postgresqlTuningCalculatorOptionsSchema } from "./schema";

const O = postgresqlTuningCalculatorOptionsSchema.parse({});
const get = (o: Partial<typeof O>, key: string) => computeSettings({ ...O, ...o }).find((s) => s.key === key)?.value;

describe("formatting", () => {
  it("picks GB, MB or kB", () => {
    expect(fmtKb(4 * 1024 * 1024)).toBe("4GB");
    expect(fmtKb(1536 * 1024)).toBe("1536MB");
    expect(fmtKb(20559)).toBe("20559kB");
    expect(fmtKb(64)).toBe("64kB");
  });
});

describe("formulas (16GB, 4 CPU, web, SSD, v16)", () => {
  it("memory", () => {
    expect(get({}, "shared_buffers")).toBe("4GB");
    expect(get({}, "effective_cache_size")).toBe("12GB");
    expect(get({}, "maintenance_work_mem")).toBe("1GB");
    expect(get({}, "wal_buffers")).toBe("16MB");
  });
  it("work_mem = (RAM - shared) / ((conns + workers) x 3)", () => {
    // 12 GB = 12582912 kB; (200 + 4) * 3 = 612
    expect(get({}, "work_mem")).toBe(`${Math.floor(12582912 / 612)}kB`);
  });
  it("planner and wal", () => {
    expect(get({}, "random_page_cost")).toBe("1.1");
    expect(get({}, "effective_io_concurrency")).toBe("200");
    expect(get({}, "min_wal_size")).toBe("1GB");
    expect(get({}, "max_wal_size")).toBe("4GB");
    expect(get({}, "checkpoint_completion_target")).toBe("0.9");
  });
  it("parallel workers", () => {
    expect(get({}, "max_worker_processes")).toBe("4");
    expect(get({}, "max_parallel_workers_per_gather")).toBe("2");
    expect(get({}, "max_parallel_workers")).toBe("4");
    expect(get({}, "max_parallel_maintenance_workers")).toBe("2");
  });
});

describe("workload and hardware variations", () => {
  it("HDD changes cost and IO concurrency", () => {
    expect(get({ storage: "hdd" }, "random_page_cost")).toBe("4");
    expect(get({ storage: "hdd" }, "effective_io_concurrency")).toBe("2");
    expect(get({ storage: "san" }, "effective_io_concurrency")).toBe("300");
  });
  it("desktop uses a sixteenth of RAM and tiny work_mem divisor", () => {
    expect(get({ dbType: "desktop" }, "shared_buffers")).toBe("1GB");
    expect(get({ dbType: "desktop" }, "effective_cache_size")).toBe("4GB");
    expect(get({ dbType: "desktop" }, "max_connections")).toBe("20");
  });
  it("data warehouse: more stats, bigger maintenance memory, uncapped gather workers", () => {
    expect(get({ dbType: "dw" }, "default_statistics_target")).toBe("500");
    expect(get({ dbType: "dw" }, "maintenance_work_mem")).toBe("2GB");
    expect(get({ dbType: "dw", cpus: 32 }, "max_parallel_workers_per_gather")).toBe("16");
    expect(get({ dbType: "web", cpus: 32 }, "max_parallel_workers_per_gather")).toBe("4");
  });
  it("maintenance_work_mem is capped at 2GB", () => {
    expect(get({ ram: 256 }, "maintenance_work_mem")).toBe("2GB");
  });
  it("huge pages from 32GB", () => {
    expect(get({ ram: 31 }, "huge_pages")).toBe("off");
    expect(get({ ram: 32 }, "huge_pages")).toBe("try");
  });
  it("fewer than 4 CPUs disables the parallel block", () => {
    expect(get({ cpus: 2 }, "max_worker_processes")).toBeUndefined();
    // and work_mem ignores worker count then
    expect(get({ cpus: 2 }, "work_mem")).toBe(`${Math.floor(12582912 / (200 * 3))}kB`);
  });
  it("maintenance workers need v11", () => {
    expect(get({ version: 10 }, "max_parallel_maintenance_workers")).toBeUndefined();
  });
  it("custom max_connections flows into work_mem", () => {
    const a = parseInt(get({ maxConnections: 50 }, "work_mem")!, 10);
    const b = parseInt(get({}, "work_mem")!, 10);
    expect(a).toBeGreaterThan(b);
  });
  it("small RAM: wal_buffers floor and work_mem floor", () => {
    expect(get({ ram: 256, ramUnit: "MB", maxConnections: 10000 }, "work_mem")).toBe("64kB");
    expect(get({ ram: 512, ramUnit: "MB" }, "wal_buffers")).toBe("3932kB");
  });
  it("wal_buffers rounds 14-16MB up to 16MB", () => {
    // 2GB RAM -> shared_buffers 512MB -> 3% = 15.36MB, inside the 14-16MB band
    expect(get({ ram: 2 }, "wal_buffers")).toBe("16MB");
    // 1GB RAM -> shared_buffers 256MB -> 3% = 7.68MB stays as computed
    expect(get({ ram: 1 }, "wal_buffers")).toBe("7864kB");
  });
});

describe("output formats", () => {
  it("conf has aligned keys and restart markers", () => {
    const out = fn("", {}).output;
    expect(out).toMatch(/shared_buffers\s+= 4GB\s+# RAM \/ 4 \(restart\)/);
    expect(out).toContain("# monitoring and housekeeping");
  });
  it("ALTER SYSTEM quotes non-numeric values", () => {
    const out = fn("", { format: "alter-system", extras: false }).output;
    expect(out).toContain("ALTER SYSTEM SET shared_buffers = '4GB';");
    expect(out).toContain("ALTER SYSTEM SET max_connections = 200;");
    expect(out).toContain("SELECT pg_reload_conf();");
    expect(out).toContain("restart required for:");
  });
  it("docker flags", () => {
    const out = fn("", { format: "docker", extras: true }).output;
    expect(out).toContain("-c shared_buffers=4GB");
    expect(out).toContain("-c shared_preload_libraries=pg_stat_statements");
  });
  it("json", () => {
    const j = JSON.parse(fn("", { format: "json", extras: false }).output) as Record<string, string>;
    expect(j.shared_buffers).toBe("4GB");
  });
  it("rejects tiny RAM", () => {
    expect(fn("", { ram: 128, ramUnit: "MB" }).error).not.toBeNull();
  });
});
