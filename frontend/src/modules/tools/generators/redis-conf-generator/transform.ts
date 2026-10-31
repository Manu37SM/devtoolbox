import { KJUR } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { RedisConfGeneratorOptions } from "./schema";

type Opts = RedisConfGeneratorOptions;

const SIZE = /^\d+(?:b|k|kb|m|mb|g|gb)?$/i;
const NAME = /^[A-Za-z0-9_.-]+$/;
const PATH = /^[^\s"'\\]+$/;

interface PresetDef {
  policy: Exclude<Opts["evictionPolicy"], "auto">;
  persistence: Exclude<Opts["persistence"], "auto">;
  why: string;
}

export const PRESETS: Record<Exclude<Opts["preset"], "custom">, PresetDef> = {
  cache: { policy: "allkeys-lru", persistence: "none", why: "pure cache: evict least recently used keys when full, never touch disk" },
  session: { policy: "volatile-lru", persistence: "rdb+aof", why: "sessions have TTLs: evict only keys with an expiry, keep them across restarts" },
  queue: { policy: "noeviction", persistence: "rdb+aof", why: "never silently drop queued work: refuse writes when full instead" },
  durable: { policy: "noeviction", persistence: "aof", why: "primary data store: no eviction, append-only log with fsync every second" },
};

export function sha256Hex(s: string): string {
  return KJUR.crypto.Util.sha256(s);
}

function check(o: Opts): string[] {
  const errs: string[] = [];
  if (!SIZE.test(o.maxMemory.trim()) && o.maxMemory.trim() !== "0") errs.push("maxmemory must look like 256mb, 2gb or a byte count");
  for (const [label, v] of [["Unix socket", o.unixSocket], ["Directory", o.dir], ["Log file", o.logFile], ["TLS certificate", o.tlsCert], ["TLS key", o.tlsKey], ["TLS CA", o.tlsCa]] as const) {
    if (v && !PATH.test(v)) errs.push(`${label} path may not contain spaces or quotes`);
  }
  if (!/^[\d.:a-fA-F\s*-]*$/.test(o.bind)) errs.push("bind takes IP addresses separated by spaces (use - before an address that may be absent)");
  if (o.requirePass && /[\s"\\]/.test(o.requirePass)) errs.push("requirepass may not contain spaces, quotes or backslashes");
  if (o.masterAuth && /[\s"\\]/.test(o.masterAuth)) errs.push("masterauth may not contain spaces, quotes or backslashes");
  if (o.aclUser && !NAME.test(o.aclUser)) errs.push("ACL user name may only use letters, digits, . _ -");
  if (o.aclUser && o.aclUser.toLowerCase() === "default") errs.push('Use requirepass for the "default" user; the ACL user must have its own name');
  if (o.aclUser && !o.aclPassword) errs.push("Give the ACL user a password");
  if (o.aclPassword && /\s/.test(o.aclPassword)) errs.push("ACL password may not contain whitespace");
  if (o.aclKeyPattern && !/^[^\s]+$/.test(o.aclKeyPattern)) errs.push("ACL key pattern may not contain whitespace");
  if (o.replicaOf && !/^[A-Za-z0-9.:_-]+\s+\d{1,5}$/.test(o.replicaOf.trim())) errs.push('replicaof must be "host port", e.g. 10.0.0.5 6379');
  if (o.rdbSave.trim() && !/^(?:\d+\s+\d+\s*)+$/.test(o.rdbSave.trim())) errs.push('RDB save points are pairs of "seconds changes", e.g. 3600 1 300 100 60 10000');
  const dis = o.disableCommands.split(/[\s,]+/).filter(Boolean);
  for (const c of dis) if (!/^[A-Za-z][A-Za-z0-9_|-]*$/.test(c)) errs.push(`"${c}" is not a command name`);
  if (o.keyspaceEvents && !/^[KEg$lshzxetdmnA]+$/.test(o.keyspaceEvents)) errs.push("notify-keyspace-events flags are letters from KEg$lshzxetdmnA");
  if (o.tlsPort > 0 && o.port === o.tlsPort) errs.push("TLS port and plain port must differ");
  return errs;
}

export function generateRedisConf(input: string, o: Opts): string {
  const errs = check(o);
  if (errs.length) throw new Error(errs[0]);
  const L: string[] = [];
  const c = (t: string) => {
    if (o.comments) L.push(`# ${t}`);
  };
  const sec = (t: string) => {
    if (L.length) L.push("");
    if (o.comments) L.push(`################ ${t} ################`);
  };
  const def = o.preset === "custom" ? null : PRESETS[o.preset];
  const policy = o.evictionPolicy === "auto" ? (def?.policy ?? "noeviction") : o.evictionPolicy;
  const persistence = o.persistence === "auto" ? (def?.persistence ?? "rdb") : o.persistence;
  const warnings: string[] = [];

  if (o.comments) {
    L.push(`# redis.conf generated for Redis 7.x${def ? ` — preset "${o.preset}": ${def.why}` : ""}`);
  }

  sec("Network");
  L.push(`bind ${o.bind.trim() || "127.0.0.1 -::1"}`);
  L.push(`port ${o.port}`);
  L.push(`protected-mode ${o.protectedMode ? "yes" : "no"}`);
  if (o.unixSocket) {
    L.push(`unixsocket ${o.unixSocket}`);
    L.push("unixsocketperm 700");
  }
  L.push(`timeout ${o.timeout}`);
  L.push("tcp-keepalive 300");
  L.push(`maxclients ${o.maxClients}`);
  const publicBind = /(^|\s)(0\.0\.0\.0|::|\*)(\s|$)/.test(o.bind);
  if (publicBind && !o.requirePass && !o.aclUser) warnings.push("Redis listens on all interfaces without a password: anyone who can reach the port has full access");
  if (publicBind && !o.protectedMode) warnings.push("protected-mode is off while listening on all interfaces");

  if (o.tlsPort > 0) {
    sec("TLS");
    L.push(`tls-port ${o.tlsPort}`);
    L.push(`tls-cert-file ${o.tlsCert}`);
    L.push(`tls-key-file ${o.tlsKey}`);
    L.push(`tls-ca-cert-file ${o.tlsCa}`);
    L.push("tls-protocols \"TLSv1.2 TLSv1.3\"");
    L.push("tls-auth-clients optional");
    L.push("tls-replication yes");
    if (o.port !== 0) c("Set port 0 above to accept TLS connections only.");
  }

  sec("Security");
  if (o.requirePass) {
    L.push(`requirepass ${o.requirePass}`);
    if (o.requirePass.length < 16) warnings.push("requirepass is shorter than 16 characters; Redis can be tried at hundreds of thousands of guesses per second");
  }
  if (o.aclUser) {
    const secret = o.aclHashPassword ? `#${sha256Hex(o.aclPassword)}` : `>${o.aclPassword}`;
    c(`Application user limited to keys matching ${o.aclKeyPattern}; dangerous commands denied.`);
    L.push(`user ${o.aclUser} on ${secret} ~${o.aclKeyPattern} &* -@all +@read +@write +@list +@set +@hash +@string +@sortedset +@stream +@pubsub +@connection +@transaction +@keyspace -@dangerous`);
    L.push("user default off");
    if (!o.aclHashPassword) warnings.push("ACL password is stored in plain text in the file; tick hashed storage or restrict file permissions (chmod 640)");
  }
  const dis = o.disableCommands.split(/[\s,]+/).filter(Boolean);
  for (const d of dis) L.push(`rename-command ${d.toUpperCase()} ""`);

  sec("Memory");
  L.push(`maxmemory ${o.maxMemory.trim() || "0"}`);
  L.push(`maxmemory-policy ${policy}`);
  if (policy.endsWith("lru") || policy.endsWith("lfu") || policy === "volatile-ttl") L.push("maxmemory-samples 5");
  if (o.maxMemory.trim() === "0" && policy !== "noeviction") warnings.push("maxmemory is 0 (unlimited), so the eviction policy never applies");
  if (policy === "noeviction" && (o.preset === "cache")) warnings.push("A cache with noeviction starts returning OOM errors when full");
  if (o.lazyFree) {
    L.push("lazyfree-lazy-eviction yes");
    L.push("lazyfree-lazy-expire yes");
    L.push("lazyfree-lazy-server-del yes");
    L.push("lazyfree-lazy-user-del yes");
    L.push("lazyfree-lazy-user-flush yes");
    L.push("replica-lazy-flush yes");
  }
  if (o.activeDefrag) {
    c("Needs Redis built with its bundled jemalloc (official packages and the Docker image); some distro builds refuse to start.");
    L.push("activedefrag yes");
    L.push("active-defrag-ignore-bytes 100mb");
    L.push("active-defrag-threshold-lower 10");
  }

  sec("Persistence");
  L.push(`dir ${o.dir}`);
  const rdb = persistence === "rdb" || persistence === "rdb+aof";
  const aof = persistence === "aof" || persistence === "rdb+aof";
  if (rdb) {
    L.push(`save ${o.rdbSave.trim() || "3600 1 300 100 60 10000"}`);
    L.push("dbfilename dump.rdb");
    L.push("rdbcompression yes");
    L.push("rdbchecksum yes");
    L.push("stop-writes-on-bgsave-error yes");
  } else {
    L.push('save ""');
  }
  L.push(`appendonly ${aof ? "yes" : "no"}`);
  if (aof) {
    L.push('appenddirname "appendonlydir"');
    L.push(`appendfsync ${o.aofFsync}`);
    L.push("no-appendfsync-on-rewrite no");
    L.push("auto-aof-rewrite-percentage 100");
    L.push("auto-aof-rewrite-min-size 64mb");
    L.push("aof-use-rdb-preamble yes");
  }
  if (persistence === "none") c("No persistence: all data is lost on restart.");

  if (o.replicaOf) {
    sec("Replication");
    L.push(`replicaof ${o.replicaOf.trim()}`);
    if (o.masterAuth) L.push(`masterauth ${o.masterAuth}`);
    L.push("replica-read-only yes");
    L.push("replica-serve-stale-data yes");
    L.push("repl-diskless-sync yes");
  }

  sec("Performance");
  L.push(`databases ${o.databases}`);
  L.push("hz 10");
  L.push("dynamic-hz yes");
  if (o.ioThreads > 1) {
    L.push(`io-threads ${o.ioThreads}`);
    L.push("io-threads-do-reads yes");
    c("io-threads only helps with several busy clients; keep it below the number of cores.");
  }

  sec("Observability");
  if (o.slowlog) {
    L.push("slowlog-log-slower-than 10000");
    L.push("slowlog-max-len 256");
    L.push("latency-monitor-threshold 100");
  }
  if (o.keyspaceEvents) L.push(`notify-keyspace-events ${o.keyspaceEvents}`);
  L.push(`loglevel ${o.logLevel}`);
  L.push(`logfile ${o.logFile ? o.logFile : '""'}`);

  // Custom directives
  const extra = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (extra.length) {
    sec("Custom directives");
    for (const line of extra) {
      if (!/^[A-Za-z][A-Za-z0-9-]*(\s+\S.*)?$/.test(line)) throw new Error(`Custom directive "${line}" must start with a directive name`);
      if (/[\u0000-\u0008\u000b-\u001f]/.test(line)) throw new Error("Custom directives may not contain control characters");
      L.push(line);
    }
    const generated = new Set(L.filter((l) => !l.startsWith("#")).map((l) => l.split(/\s+/)[0]!.toLowerCase()));
    const multi = new Set(["save", "rename-command", "user", "loadmodule", "include", "rdb-key-save-delay", "client-output-buffer-limit", "replica-announced"]);
    for (const line of extra) {
      const k = line.split(/\s+/)[0]!.toLowerCase();
      const n = L.filter((l) => !l.startsWith("#") && l.split(/\s+/)[0]!.toLowerCase() === k).length;
      if (n > 1 && !multi.has(k) && generated.has(k)) warnings.push(`"${k}" is set twice; Redis uses the last value, which is your custom line`);
    }
  }

  if (warnings.length) L.unshift(...warnings.map((w) => `# WARNING: ${w}`), "");
  return L.join("\n") + "\n";
}

export function redisConfGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    preset: options.preset ?? "cache",
    bind: options.bind ?? "127.0.0.1 -::1",
    port: options.port ?? 6379,
    protectedMode: options.protectedMode ?? true,
    unixSocket: options.unixSocket ?? "",
    requirePass: options.requirePass ?? "",
    aclUser: options.aclUser ?? "",
    aclPassword: options.aclPassword ?? "",
    aclKeyPattern: options.aclKeyPattern ?? "app:*",
    aclHashPassword: options.aclHashPassword ?? true,
    maxMemory: options.maxMemory ?? "256mb",
    evictionPolicy: options.evictionPolicy ?? "auto",
    persistence: options.persistence ?? "auto",
    aofFsync: options.aofFsync ?? "everysec",
    rdbSave: options.rdbSave ?? "3600 1 300 100 60 10000",
    replicaOf: options.replicaOf ?? "",
    masterAuth: options.masterAuth ?? "",
    tlsPort: options.tlsPort ?? 0,
    tlsCert: options.tlsCert ?? "/etc/redis/tls/redis.crt",
    tlsKey: options.tlsKey ?? "/etc/redis/tls/redis.key",
    tlsCa: options.tlsCa ?? "/etc/redis/tls/ca.crt",
    maxClients: options.maxClients ?? 10000,
    timeout: options.timeout ?? 0,
    databases: options.databases ?? 16,
    ioThreads: options.ioThreads ?? 1,
    lazyFree: options.lazyFree ?? true,
    activeDefrag: options.activeDefrag ?? false,
    disableCommands: options.disableCommands ?? "",
    slowlog: options.slowlog ?? true,
    keyspaceEvents: options.keyspaceEvents ?? "",
    dir: options.dir ?? "/var/lib/redis",
    logLevel: options.logLevel ?? "notice",
    logFile: options.logFile ?? "",
    comments: options.comments ?? true,
  };
  try {
    return { output: generateRedisConf(input, o), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
