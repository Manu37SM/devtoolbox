import type { TransformResult } from "@/lib/tool-transform";
import type { ThreadDumpAnalyzerOptions } from "./schema";

export interface ThreadInfo {
  name: string;
  daemon: boolean;
  state: string;
  frames: string[];
  locked: string[];
  waitingToLock: string | null;
  waitingOn: string | null;
  parkingFor: string | null;
}

const HEADER = /^"(.+?)"\s*(.*)$/;
const LOCK_ID = /<(0x[0-9a-fA-F]+)>(?:\s*\((?:a|an)\s+([^)]+)\))?/;
const JVM_THREAD = /^(GC |G1 |C1 |C2 |VM |Signal Dispatcher|Service Thread|Sweeper|Common-Cleaner|Notification Thread|Attach Listener|Finalizer|Reference Handler|Monitor Deflation|JVMCI|ZGC|Shenandoah|Concurrent |Periodic GC|Monitor Ctrl)/;

export function parseThreadDump(input: string): ThreadInfo[] {
  const threads: ThreadInfo[] = [];
  let cur: ThreadInfo | null = null;
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h = HEADER.exec(line);
    if (h) {
      cur = { name: h[1]!, daemon: /\bdaemon\b/.test(h[2]!), state: inferStateFromHeader(h[2]!), frames: [], locked: [], waitingToLock: null, waitingOn: null, parkingFor: null };
      threads.push(cur);
      continue;
    }
    if (!cur) continue;
    const t = line.trim();
    const st = /^java\.lang\.Thread\.State:\s*([A-Z_]+)/.exec(t);
    if (st) { cur.state = st[1]!; continue; }
    if (t.startsWith("at ")) { cur.frames.push(t.slice(3)); continue; }
    const lock = LOCK_ID.exec(t);
    const label = lock ? `${lock[1]}${lock[2] ? ` (${lock[2]})` : ""}` : null;
    if (t.startsWith("- locked") && label) cur.locked.push(label);
    else if (t.startsWith("- waiting to lock") && label) cur.waitingToLock = label;
    else if ((t.startsWith("- waiting on") || t.startsWith("- waiting to re-lock")) && label) cur.waitingOn = label;
    else if (t.startsWith("- parking to wait for") && label) cur.parkingFor = label;
  }
  return threads;
}

function inferStateFromHeader(rest: string): string {
  if (/runnable/.test(rest)) return "RUNNABLE";
  if (/waiting for monitor entry/.test(rest)) return "BLOCKED";
  if (/waiting on condition|in Object\.wait/.test(rest)) return "WAITING";
  return "UNKNOWN";
}

const lockId = (label: string) => label.split(" ")[0]!;

/** Cycles in the "waiting to lock X, X held by T" graph. */
export function findDeadlocks(threads: ThreadInfo[]): string[][] {
  const owner = new Map<string, string>();
  for (const t of threads) for (const l of t.locked) owner.set(lockId(l), t.name);
  const waitsFor = new Map<string, string>();
  for (const t of threads) {
    const target = t.waitingToLock ?? t.parkingFor;
    if (!target) continue;
    const o = owner.get(lockId(target));
    if (o && o !== t.name) waitsFor.set(t.name, o);
  }
  const cycles: string[][] = [];
  const seen = new Set<string>();
  for (const start of waitsFor.keys()) {
    if (seen.has(start)) continue;
    const path: string[] = [];
    const index = new Map<string, number>();
    let cur: string | undefined = start;
    while (cur && !index.has(cur) && !seen.has(cur)) {
      index.set(cur, path.length);
      path.push(cur);
      cur = waitsFor.get(cur);
    }
    if (cur && index.has(cur)) cycles.push(path.slice(index.get(cur)!));
    for (const p of path) seen.add(p);
  }
  return cycles;
}

export function runThreadDumpAnalyzer(input: string, options: ThreadDumpAnalyzerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const all = parseThreadDump(input);
  if (all.length === 0) return { output: "", error: { message: 'No threads found. Paste jstack, jcmd Thread.print or kill -3 output (lines starting with "thread-name").' } };
  const threads = options.hideJvmThreads ? all.filter((t) => !(JVM_THREAD.test(t.name) && t.frames.length === 0)) : all;

  const byState = new Map<string, number>();
  for (const t of threads) byState.set(t.state, (byState.get(t.state) ?? 0) + 1);

  const deadlocks = findDeadlocks(all);
  const jvmReported = /Found (?:one|\d+) Java-level deadlocks?/.test(input);

  const owner = new Map<string, string>();
  for (const t of all) for (const l of t.locked) owner.set(lockId(l), t.name);
  const contention = new Map<string, { label: string; waiters: string[] }>();
  for (const t of threads) {
    const w = t.waitingToLock;
    if (!w) continue;
    const e = contention.get(lockId(w)) ?? { label: w, waiters: [] };
    e.waiters.push(t.name);
    contention.set(lockId(w), e);
  }
  const hotLocks = [...contention.entries()].sort((a, b) => b[1].waiters.length - a[1].waiters.length);

  const groups = new Map<string, { state: string; frames: string[]; names: string[] }>();
  for (const t of threads) {
    if (t.frames.length === 0) continue;
    const top = t.frames.slice(0, options.stackDepth);
    const key = `${t.state}|${top.join("|")}`;
    const g = groups.get(key) ?? { state: t.state, frames: top, names: [] };
    g.names.push(t.name);
    groups.set(key, g);
  }
  const sortedGroups = [...groups.values()].filter((g) => g.names.length > 1).sort((a, b) => b.names.length - a.names.length);

  const hot = new Map<string, number>();
  for (const t of threads) if (t.state === "RUNNABLE" && t.frames[0]) hot.set(t.frames[0], (hot.get(t.frames[0]) ?? 0) + 1);
  const hotFrames = [...hot.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (options.format === "json") {
    return {
      output: JSON.stringify({
        threads: threads.length,
        hiddenJvmThreads: all.length - threads.length,
        states: Object.fromEntries(byState),
        deadlocks,
        jvmReportedDeadlock: jvmReported,
        contendedLocks: hotLocks.map(([id, e]) => ({ lock: e.label, heldBy: owner.get(id) ?? null, waiters: e.waiters })),
        identicalStacks: sortedGroups.map((g) => ({ count: g.names.length, state: g.state, frames: g.frames, threads: g.names })),
        topRunnableFrames: hotFrames.map(([frame, count]) => ({ frame, count })),
      }, null, 2),
      error: null,
    };
  }

  const out: string[] = [];
  out.push(`Threads: ${threads.length}${all.length !== threads.length ? ` (${all.length - threads.length} JVM-internal threads hidden)` : ""}`);
  out.push([...byState.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => `  ${s.padEnd(14)} ${n}`).join("\n"));
  out.push("");
  if (deadlocks.length > 0 || jvmReported) {
    out.push(`DEADLOCK${deadlocks.length > 1 ? "S" : ""} DETECTED${jvmReported ? " (also reported by the JVM)" : ""}`);
    for (const cycle of deadlocks) out.push(`  ${[...cycle, cycle[0]].map((n) => `"${n}"`).join(" -> ")}`);
    out.push("");
  } else out.push("No deadlock found.\n");
  if (hotLocks.length > 0) {
    out.push("Contended locks (threads BLOCKED waiting for a monitor):");
    for (const [id, e] of hotLocks.slice(0, 10)) out.push(`  ${e.label}: held by ${owner.has(id) ? `"${owner.get(id)}"` : "unknown"}, ${e.waiters.length} waiting (${e.waiters.slice(0, 5).map((n) => `"${n}"`).join(", ")}${e.waiters.length > 5 ? ", ..." : ""})`);
    out.push("");
  }
  if (hotFrames.length > 0) {
    out.push("Top frames of RUNNABLE threads:");
    for (const [f, n] of hotFrames) out.push(`  ${String(n).padStart(4)}  ${f}`);
    out.push("");
  }
  if (sortedGroups.length > 0) {
    out.push(`Threads with identical stacks (top ${options.stackDepth} frames):`);
    for (const g of sortedGroups.slice(0, 15)) {
      out.push(`  ${g.names.length} x ${g.state}  e.g. "${g.names[0]}"`);
      for (const f of g.frames) out.push(`      at ${f}`);
    }
  }
  return { output: out.join("\n").trimEnd(), error: null };
}
