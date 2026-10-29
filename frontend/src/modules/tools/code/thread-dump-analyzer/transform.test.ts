import { describe, expect, it } from "vitest";
import { findDeadlocks, parseThreadDump, runThreadDumpAnalyzer } from "./transform";
import type { ThreadDumpAnalyzerOptions } from "./schema";

const opts: ThreadDumpAnalyzerOptions = { format: "report", stackDepth: 5, hideJvmThreads: true };

const DEADLOCK = `2024-05-01 10:00:00
Full thread dump OpenJDK 64-Bit Server VM (21.0.2+13 mixed mode):

"worker-1" #21 prio=5 os_prio=0 cpu=10ms elapsed=5s tid=0x01 nid=0x10 waiting for monitor entry  [0x00007]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.acme.Bank.transfer(Bank.java:42)
\t- waiting to lock <0x000000071a> (a java.lang.Object)
\t- locked <0x000000071b> (a java.lang.Object)
\tat com.acme.Worker.run(Worker.java:10)

"worker-2" #22 prio=5 os_prio=0 tid=0x02 nid=0x11 waiting for monitor entry  [0x00008]
   java.lang.Thread.State: BLOCKED (on object monitor)
\tat com.acme.Bank.transfer(Bank.java:42)
\t- waiting to lock <0x000000071b> (a java.lang.Object)
\t- locked <0x000000071a> (a java.lang.Object)
\tat com.acme.Worker.run(Worker.java:10)

"http-nio-8080-exec-1" #30 daemon prio=5 tid=0x03 nid=0x12 waiting on condition  [0x00009]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(Native Method)
\t- parking to wait for  <0x00000007aa> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
\tat java.util.concurrent.locks.LockSupport.park(LockSupport.java:371)

"http-nio-8080-exec-2" #31 daemon prio=5 tid=0x04 nid=0x13 waiting on condition  [0x0000a]
   java.lang.Thread.State: WAITING (parking)
\tat jdk.internal.misc.Unsafe.park(Native Method)
\t- parking to wait for  <0x00000007ab> (a java.util.concurrent.locks.AbstractQueuedSynchronizer$ConditionObject)
\tat java.util.concurrent.locks.LockSupport.park(LockSupport.java:371)

"GC Thread#0" os_prio=0 cpu=1ms tid=0x05 nid=0x14 runnable

Found one Java-level deadlock:
=============================
`;

describe("parseThreadDump", () => {
  it("reads names, daemon flag, states, frames and lock lines", () => {
    const t = parseThreadDump(DEADLOCK);
    expect(t.map((x) => x.name)).toEqual(["worker-1", "worker-2", "http-nio-8080-exec-1", "http-nio-8080-exec-2", "GC Thread#0"]);
    expect(t[0]).toMatchObject({ daemon: false, state: "BLOCKED", waitingToLock: "0x000000071a (java.lang.Object)", locked: ["0x000000071b (java.lang.Object)"] });
    expect(t[2]!.daemon).toBe(true);
    expect(t[2]!.parkingFor).toMatch(/^0x00000007aa/);
    expect(t[4]!.state).toBe("RUNNABLE");
  });
});

describe("findDeadlocks", () => {
  it("finds a two-thread monitor cycle", () => {
    const cycles = findDeadlocks(parseThreadDump(DEADLOCK));
    expect(cycles).toHaveLength(1);
    expect([...cycles[0]!].sort()).toEqual(["worker-1", "worker-2"]);
  });
});

describe("runThreadDumpAnalyzer", () => {
  it("reports states, the deadlock, contended locks and identical stacks", () => {
    const r = runThreadDumpAnalyzer(DEADLOCK, opts);
    expect(r.error).toBeNull();
    expect(r.output).toContain("Threads: 4 (1 JVM-internal threads hidden)");
    expect(r.output).toContain("DEADLOCK DETECTED (also reported by the JVM)");
    expect(r.output).toMatch(/"worker-\d" -> "worker-\d" -> "worker-\d"/);
    expect(r.output).toContain('0x000000071a (java.lang.Object): held by "worker-2", 1 waiting ("worker-1")');
    expect(r.output).toContain('2 x WAITING  e.g. "http-nio-8080-exec-1"');
  });
  it("keeps JVM threads when asked and emits JSON", () => {
    const j = JSON.parse(runThreadDumpAnalyzer(DEADLOCK, { ...opts, format: "json", hideJvmThreads: false }).output);
    expect(j.threads).toBe(5);
    expect(j.states).toEqual({ BLOCKED: 2, WAITING: 2, RUNNABLE: 1 });
    expect(j.identicalStacks[0].count).toBe(2);
  });
  it("explains what to paste when nothing parses", () => {
    expect(runThreadDumpAnalyzer("hello", opts).error?.message).toMatch(/jstack/);
  });
});
