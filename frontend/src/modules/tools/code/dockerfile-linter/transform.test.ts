import { describe, expect, it } from "vitest";
import { lintDockerfile, parseDockerfile, runDockerfileLinter } from "./transform";

const rules = (df: string) => lintDockerfile(df).map((f) => f.rule);

describe("parseDockerfile", () => {
  it("joins continuations and skips comments", () => {
    const p = parseDockerfile("FROM a:1\n# c\nRUN a \\\n  # inner\n  && b\nCMD [\"x\"]");
    expect(p.map((x) => [x.line, x.cmd])).toEqual([[1, "FROM"], [3, "RUN"], [6, "CMD"]]);
    expect(p[1]!.args).toBe("a && b");
  });
});

describe("lintDockerfile", () => {
  it("accepts a well-formed Dockerfile", () => {
    const df = `FROM node:20.11-slim AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nFROM node:20.11-slim\nWORKDIR /app\nUSER node\nEXPOSE 3000\nHEALTHCHECK CMD node health.js\nCMD ["node", "server.js"]`;
    expect(lintDockerfile(df)).toEqual([]);
  });
  it("flags image tags", () => {
    expect(rules("FROM ubuntu\nUSER app")).toContain("DL3006");
    expect(rules("FROM ubuntu:latest\nUSER app")).toContain("DL3007");
    expect(rules("FROM ubuntu:22.04\nUSER app")).not.toContain("DL3006");
    expect(rules("FROM scratch\nUSER app")).not.toContain("DL3006");
    expect(rules("FROM a:1 AS base\nFROM base\nUSER app")).not.toContain("DL3006");
  });
  it("flags apt-get mistakes", () => {
    const r = rules("FROM debian:12\nRUN apt-get install curl\nUSER app");
    expect(r).toEqual(expect.arrayContaining(["DL3015", "DF003", "DL3009", "DF004"]));
    expect(rules("FROM debian:12\nRUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*\nUSER app")).toEqual([]);
    expect(rules("FROM debian:12\nRUN apt install -y curl\nUSER app")).toContain("DL3027");
  });
  it("flags ADD, shell-form CMD, relative WORKDIR, sudo, cd and curl|sh", () => {
    const r = rules("FROM a:1\nADD . /app\nWORKDIR app\nRUN cd /x && sudo make\nRUN curl -s https://x.sh | sh\nCMD npm start\nUSER app");
    expect(r).toEqual(expect.arrayContaining(["DL3020", "DL3000", "DL3003", "DL3004", "DF006", "DL3025", "DL3059"]));
    expect(rules("FROM a:1\nADD https://x/y.tar.gz /y\nADD app.tar.gz /a\nUSER app")).not.toContain("DL3020");
  });
  it("flags root user, secrets, bad ports, duplicates", () => {
    expect(rules("FROM a:1")).toContain("DL3002");
    expect(rules("FROM a:1\nUSER root")).toContain("DL3002");
    expect(rules("FROM a:1\nENV DB_PASSWORD=hunter2\nUSER app")).toContain("DF002");
    expect(rules("FROM a:1\nENV DB_PASSWORD=$DB_PASSWORD\nUSER app")).not.toContain("DF002");
    expect(rules("FROM a:1\nEXPOSE 99999\nUSER app")).toContain("DL3011");
    expect(rules('FROM a:1\nCMD ["a"]\nCMD ["b"]\nUSER app')).toContain("DL4003");
    expect(rules("RUN echo hi")).toContain("DF001");
    expect(rules("FROM a:1\nMAINTAINER me\nUSER app")).toContain("DL4000");
  });
});

describe("runDockerfileLinter", () => {
  it("filters by severity and reports errors", () => {
    const df = "FROM ubuntu\nRUN apt-get install curl";
    const all = runDockerfileLinter(df, { minSeverity: "info" });
    expect(all.output).toContain("DL3006");
    expect(all.error?.message).toContain("error");
    const errs = runDockerfileLinter(df, { minSeverity: "error" });
    expect(errs.output).not.toContain("DL3006");
    expect(errs.output).toContain("DF004");
  });
});
