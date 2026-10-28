import { describe, expect, it } from "vitest";
import { generateSystemdUnit } from "./transform";

const o = { type: "simple" as const, restart: "on-failure" as const, restartSec: 5, wantedBy: "multi-user.target" as const, afterNetwork: true, hardening: true };
const input = "Description=My API\nExecStart=/usr/bin/node /srv/app/server.js\nUser=app\nWorkingDirectory=/srv/app\nEnvironment=NODE_ENV=production\nEnvironment=PORT=3000";

describe("generateSystemdUnit", () => {
  it("assembles unit, service and install sections", () => {
    const r = generateSystemdUnit(input, o);
    expect(r.error).toBeNull();
    expect(r.output).toContain("[Unit]\nDescription=My API\nAfter=network-online.target");
    expect(r.output).toContain("Environment=NODE_ENV=production\nEnvironment=PORT=3000");
    expect(r.output).toContain("Restart=on-failure\nRestartSec=5");
    expect(r.output).toContain("ReadWritePaths=/srv/app");
    expect(r.output).toContain("[Install]\nWantedBy=multi-user.target");
    expect(r.output).not.toContain("runs as root");
  });
  it("warns about root and handles oneshot", () => {
    const r = generateSystemdUnit("ExecStart=/usr/local/bin/job", { ...o, type: "oneshot" });
    expect(r.output).toContain("runs as root");
    expect(r.output).toContain("RemainAfterExit=yes");
    expect(r.output).not.toContain("Restart=");
  });
  it("can drop hardening and network ordering", () => {
    const r = generateSystemdUnit(input, { ...o, hardening: false, afterNetwork: false }).output;
    expect(r).not.toContain("NoNewPrivileges");
    expect(r).not.toContain("network-online");
  });
  it("validates", () => {
    expect(generateSystemdUnit("User=x", o).error?.message).toMatch(/ExecStart/);
    expect(generateSystemdUnit("ExecStart=node app.js", o).error?.message).toMatch(/absolute/);
    expect(generateSystemdUnit("Foo=bar", o).error?.line).toBe(1);
    expect(generateSystemdUnit("-bad", o).error?.message).toMatch(/Key=value/);
    expect(generateSystemdUnit("", o)).toEqual({ output: "", error: null });
  });
});
