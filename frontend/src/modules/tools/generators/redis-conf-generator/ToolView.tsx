"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { redisConfGenerator } from "./transform";
import type { RedisConfGeneratorOptions } from "./schema";

type Options = RedisConfGeneratorOptions;

const defaultOptions: Options = {"preset": "cache", "bind": "127.0.0.1 -::1", "port": 6379, "protectedMode": true, "unixSocket": "", "requirePass": "", "aclUser": "", "aclPassword": "", "aclKeyPattern": "app:*", "aclHashPassword": true, "maxMemory": "256mb", "evictionPolicy": "auto", "persistence": "auto", "aofFsync": "everysec", "rdbSave": "3600 1 300 100 60 10000", "replicaOf": "", "masterAuth": "", "tlsPort": 0, "tlsCert": "/etc/redis/tls/redis.crt", "tlsKey": "/etc/redis/tls/redis.key", "tlsCa": "/etc/redis/tls/ca.crt", "maxClients": 10000, "timeout": 0, "databases": 16, "ioThreads": 1, "lazyFree": true, "activeDefrag": false, "disableCommands": "", "slowlog": true, "keyspaceEvents": "", "dir": "/var/lib/redis", "logLevel": "notice", "logFile": "", "comments": true} as Options;

export function RedisConfGeneratorToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => redisConfGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Preset"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.preset} onChange={(e) => setOptions((o) => ({ ...o, preset: e.target.value as Options["preset"] }))}>
            <option value={"cache"}>{"Cache"}</option>
            <option value={"session"}>{"Session store"}</option>
            <option value={"queue"}>{"Queue / jobs"}</option>
            <option value={"durable"}>{"Durable data store"}</option>
            <option value={"custom"}>{"Custom"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"maxmemory"}
          <input type="text" value={options.maxMemory} placeholder={"256mb"} onChange={(e) => setOptions((o) => ({ ...o, maxMemory: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Eviction"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.evictionPolicy} onChange={(e) => setOptions((o) => ({ ...o, evictionPolicy: e.target.value as Options["evictionPolicy"] }))}>
            <option value={"auto"}>{"Per preset"}</option>
            <option value={"noeviction"}>{"noeviction"}</option>
            <option value={"allkeys-lru"}>{"allkeys-lru"}</option>
            <option value={"volatile-lru"}>{"volatile-lru"}</option>
            <option value={"allkeys-lfu"}>{"allkeys-lfu"}</option>
            <option value={"volatile-lfu"}>{"volatile-lfu"}</option>
            <option value={"allkeys-random"}>{"allkeys-random"}</option>
            <option value={"volatile-random"}>{"volatile-random"}</option>
            <option value={"volatile-ttl"}>{"volatile-ttl"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Persistence"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.persistence} onChange={(e) => setOptions((o) => ({ ...o, persistence: e.target.value as Options["persistence"] }))}>
            <option value={"auto"}>{"Per preset"}</option>
            <option value={"none"}>{"None"}</option>
            <option value={"rdb"}>{"RDB snapshots"}</option>
            <option value={"aof"}>{"AOF"}</option>
            <option value={"rdb+aof"}>{"RDB + AOF"}</option>
          </select>
        </label>
        {["aof", "rdb+aof", "auto"].includes(String(options.persistence)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"AOF fsync"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.aofFsync} onChange={(e) => setOptions((o) => ({ ...o, aofFsync: e.target.value as Options["aofFsync"] }))}>
            <option value={"everysec"}>{"everysec"}</option>
            <option value={"always"}>{"always"}</option>
            <option value={"no"}>{"no"}</option>
          </select>
        </label>
        )}
        {["rdb", "rdb+aof", "auto"].includes(String(options.persistence)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"RDB save points"}
          <input type="text" value={options.rdbSave} placeholder={"3600 1 300 100 60 10000"} onChange={(e) => setOptions((o) => ({ ...o, rdbSave: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"bind"}
          <input type="text" value={options.bind} placeholder={"127.0.0.1 -::1"} onChange={(e) => setOptions((o) => ({ ...o, bind: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"port"}
          <input type="number" min={0} max={65535} value={options.port} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, port: Math.min(65535, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.protectedMode} onChange={(e) => setOptions((o) => ({ ...o, protectedMode: e.target.checked }))} />
          {"protected-mode"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Unix socket"}
          <input type="text" value={options.unixSocket} placeholder={"/run/redis/redis.sock"} onChange={(e) => setOptions((o) => ({ ...o, unixSocket: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"requirepass"}
          <input type="text" value={options.requirePass} placeholder={"(optional)"} onChange={(e) => setOptions((o) => ({ ...o, requirePass: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ACL user"}
          <input type="text" value={options.aclUser} placeholder={"app"} onChange={(e) => setOptions((o) => ({ ...o, aclUser: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ACL password"}
          <input type="text" value={options.aclPassword} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, aclPassword: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Key pattern"}
          <input type="text" value={options.aclKeyPattern} placeholder={"app:*"} onChange={(e) => setOptions((o) => ({ ...o, aclKeyPattern: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.aclHashPassword} onChange={(e) => setOptions((o) => ({ ...o, aclHashPassword: e.target.checked }))} />
          {"Store as SHA-256"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"replicaof"}
          <input type="text" value={options.replicaOf} placeholder={"10.0.0.5 6379"} onChange={(e) => setOptions((o) => ({ ...o, replicaOf: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"masterauth"}
          <input type="text" value={options.masterAuth} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, masterAuth: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TLS port (0 = off)"}
          <input type="number" min={0} max={65535} value={options.tlsPort} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, tlsPort: Math.min(65535, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TLS cert"}
          <input type="text" value={options.tlsCert} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, tlsCert: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TLS key"}
          <input type="text" value={options.tlsKey} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, tlsKey: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TLS CA"}
          <input type="text" value={options.tlsCa} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, tlsCa: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"maxclients"}
          <input type="number" min={0} max={1000000} value={options.maxClients} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxClients: Math.min(1000000, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Idle timeout s"}
          <input type="number" min={0} max={86400} value={options.timeout} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, timeout: Math.min(86400, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"databases"}
          <input type="number" min={1} max={1024} value={options.databases} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, databases: Math.min(1024, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"io-threads"}
          <input type="number" min={1} max={16} value={options.ioThreads} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, ioThreads: Math.min(16, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lazyFree} onChange={(e) => setOptions((o) => ({ ...o, lazyFree: e.target.checked }))} />
          {"Lazy free"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.activeDefrag} onChange={(e) => setOptions((o) => ({ ...o, activeDefrag: e.target.checked }))} />
          {"Active defrag"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.slowlog} onChange={(e) => setOptions((o) => ({ ...o, slowlog: e.target.checked }))} />
          {"Slowlog + latency"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Disable commands"}
          <input type="text" value={options.disableCommands} placeholder={"FLUSHALL, DEBUG"} onChange={(e) => setOptions((o) => ({ ...o, disableCommands: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Keyspace events"}
          <input type="text" value={options.keyspaceEvents} placeholder={"Ex"} onChange={(e) => setOptions((o) => ({ ...o, keyspaceEvents: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"dir"}
          <input type="text" value={options.dir} placeholder={"/var/lib/redis"} onChange={(e) => setOptions((o) => ({ ...o, dir: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"logfile"}
          <input type="text" value={options.logFile} placeholder={"(stdout)"} onChange={(e) => setOptions((o) => ({ ...o, logFile: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"loglevel"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.logLevel} onChange={(e) => setOptions((o) => ({ ...o, logLevel: e.target.value as Options["logLevel"] }))}>
            <option value={"notice"}>{"notice"}</option>
            <option value={"warning"}>{"warning"}</option>
            <option value={"verbose"}>{"verbose"}</option>
            <option value={"debug"}>{"debug"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.comments} onChange={(e) => setOptions((o) => ({ ...o, comments: e.target.checked }))} />
          {"Comments"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Extra directives (optional, one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"lua-time-limit 5000"}
                  aria-label={"Extra directives (optional, one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"redis.conf"} fileName={"redis.conf"} value={result.output} error={result.error?.message ?? null} placeholder={"Pick a preset to generate redis.conf"} />}
        />
      </div>
    </div>
  );
}
