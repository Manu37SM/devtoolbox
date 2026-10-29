import { describe, expect, it } from "vitest";
import { parseSize, runJvmFlagsExplainer, tokenize } from "./transform";

const run = (s: string, javaVersion: "8" | "11" | "17" | "21" | "25" = "21") => runJvmFlagsExplainer(s, { javaVersion, showSystemProperties: true }).output;

describe("tokenize and sizes", () => {
  it("handles quotes, continuations and JAVA_OPTS=", () => {
    expect(tokenize(`JAVA_OPTS="-Xmx2g -Dname='a b'" \\\n -jar app.jar`)).toEqual(["-Xmx2g", "-Dname=a b", "-jar", "app.jar"]);
  });
  it("parses sizes", () => {
    expect(parseSize("512m")).toBe(512 * 1024 * 1024);
    expect(parseSize("2G")).toBe(2 * 1024 ** 3);
    expect(parseSize("abc")).toBeNull();
  });
});

describe("runJvmFlagsExplainer", () => {
  it("flags removed CMS and PermGen options on modern JDKs", () => {
    const out = run("java -XX:+UseConcMarkSweepGC -XX:MaxPermSize=256m -jar app.jar", "17");
    expect(out).toContain("-XX:UseConcMarkSweepGC was removed in JDK 14");
    expect(out).toContain("-XX:MaxPermSize was removed in JDK 8");
    expect(out).toContain("Use -XX:+UseG1GC or -XX:+UseZGC");
  });
  it("does not flag CMS on JDK 8 but notes deprecation on 11", () => {
    expect(run("-XX:+UseConcMarkSweepGC", "8")).not.toContain("Deprecated");
    expect(run("-XX:+UseConcMarkSweepGC", "11")).toContain("Deprecated since JDK 9, removed in 14");
  });
  it("detects conflicting collectors and heap mistakes", () => {
    const out = run("-Xms4g -Xmx2g -XX:+UseG1GC -XX:+UseParallelGC -XX:MaxRAMPercentage=75");
    expect(out).toContain("More than one garbage collector selected (UseG1GC, UseParallelGC)");
    expect(out).toContain("-Xms is larger than -Xmx");
    expect(out).toContain("MaxRAMPercentage/InitialRAMPercentage are ignored");
  });
  it("warns about experimental flags, heap dump path and exposed JDWP", () => {
    const out = run("-XX:+UseEpsilonGC -XX:+HeapDumpOnOutOfMemoryError -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005");
    expect(out).toContain("needs -XX:+UnlockExperimentalVMOptions");
    expect(out).toContain("HeapDumpOnOutOfMemoryError without HeapDumpPath");
    expect(out).toContain("JDWP debug port is exposed");
  });
  it("explains sizes, masks secret-looking system properties and counts unknowns", () => {
    const out = run("-Xmx512m -Xss512k -Ddb.password=hunter2 -Dspring.profiles.active=prod -XX:+SomethingMadeUp");
    expect(out).toContain("Maximum heap size. (512 MiB)");
    expect(out).toContain("db.password = ******** (looks like a secret");
    expect(out).not.toContain("hunter2");
    expect(out).toContain("spring.profiles.active = prod");
    expect(out).toContain("1 option not in this reference");
  });
  it("points old GC logging flags at -Xlog", () => {
    expect(run("-XX:+PrintGCDateStamps -Xloggc:gc.log", "11")).toMatch(/Use -Xlog:gc\*:file=gc\.log:time,uptime[\s\S]*Use -Xlog:gc:file=<path>/);
  });
});

describe("env var forms", () => {
  it("unwraps JAVA_TOOL_OPTIONS and CATALINA_OPTS", () => {
    expect(tokenize(`export JAVA_TOOL_OPTIONS='-Xmx1g -Da=b'`)).toEqual(["-Xmx1g", "-Da=b"]);
    expect(tokenize(`CATALINA_OPTS="-Xss1m"`)).toEqual(["-Xss1m"]);
  });
});
