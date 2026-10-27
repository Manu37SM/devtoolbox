import { describe, expect, it } from "vitest";
import { analyzeStacktrace, parseTrace } from "./transform";

const TRACE = `org.springframework.beans.factory.UnsatisfiedDependencyException: Error creating bean 'orderService'
\tat org.springframework.beans.factory.support.ConstructorResolver.autowireConstructor(ConstructorResolver.java:800)
\tat org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory.createBean(AbstractAutowireCapableBeanFactory.java:520)
\t... 24 common frames omitted
Caused by: java.lang.NullPointerException: Cannot invoke "String.length()" because "name" is null
\tat java.base/java.util.Objects.requireNonNull(Objects.java:233)
\tat com.acme.bank.OrderService.<init>(OrderService.java:42)
\tat jdk.internal.reflect.NativeConstructorAccessorImpl.newInstance0(Native Method)
\tat com.acme.bank.Main.main(Main.java:10)
\t... 3 more`;

const o = { appPackages: "com.acme", showFrames: true } as const;

describe("parseTrace", () => {
  it("splits the chain and attaches frames to the right exception", () => {
    const c = parseTrace(TRACE);
    expect(c.map((x) => short(x.type))).toEqual(["UnsatisfiedDependencyException", "NullPointerException"]);
    expect(c[0]!.frames).toHaveLength(2);
    expect(c[0]!.omitted).toBe(24);
    expect(c[1]!.frames.map((f) => f.method)).toEqual(["requireNonNull", "<init>", "newInstance0", "main"]);
    expect(c[1]!.message).toContain("because");
  });
  it("marks suppressed exceptions", () => {
    const c = parseTrace("java.io.IOException: boom\n\tat a.B.c(B.java:1)\n\tSuppressed: java.lang.RuntimeException: cleanup\n\t\tat a.B.d(B.java:2)");
    expect(c[1]!.suppressed).toBe(true);
  });
  it("tolerates a log-line prefix", () => {
    const c = parseTrace("2026-10-27 10:15:30,123 ERROR [main] c.a.App - java.lang.IllegalStateException: bad\n\tat a.B.c(B.java:1)");
    expect(c[0]!.type).toBe("java.lang.IllegalStateException");
  });
});
const short = (t: string) => t.slice(t.lastIndexOf(".") + 1);

describe("analyzeStacktrace", () => {
  it("names the root cause, where it was thrown and the first app frame", () => {
    const out = analyzeStacktrace(TRACE, o).output;
    expect(out).toContain('Root cause   java.lang.NullPointerException: Cannot invoke "String.length()"');
    expect(out).toContain("Thrown at    java.base/java.util.Objects.requireNonNull(Objects.java:233)");
    expect(out).toContain("Your code    com.acme.bank.OrderService.<init>(OrderService.java:42)");
    expect(out).toContain("Exception chain (2)");
    expect(out).toContain("↳ NullPointerException");
    expect(out).toContain("Usual suspects: a null field");
  });
  it("collapses framework frames when app packages are given", () => {
    const out = analyzeStacktrace(TRACE, o).output;
    expect(out).toContain("→ at com.acme.bank.OrderService.<init>");
    expect(out).toMatch(/… 1 framework frame\n/);
    expect(out).toContain("… 3 more shared");
  });
  it("shows every frame without app packages, and can hide frames", () => {
    const all = analyzeStacktrace(TRACE, { appPackages: "", showFrames: true }).output;
    expect(all).toContain("Objects.requireNonNull");
    expect(all).not.toContain("framework frame");
    expect(analyzeStacktrace(TRACE, { appPackages: "", showFrames: false }).output).not.toContain("Frames of root cause");
  });
  it("says so when no frame belongs to the app", () => {
    expect(analyzeStacktrace(TRACE, { appPackages: "org.other", showFrames: false }).output).toContain("no frames in org.other");
  });
  it("gives Oracle hints for SQL exceptions", () => {
    expect(analyzeStacktrace("java.sql.SQLException: ORA-01795: maximum number of expressions in a list is 1000\n\tat oracle.jdbc.Driver.x(Driver.java:1)", o).output).toContain("ORA-01795");
  });
  it("errors on non-traces", () => {
    expect(analyzeStacktrace("hello world", o).error).not.toBeNull();
    expect(analyzeStacktrace("", o)).toEqual({ output: "", error: null });
  });
});
