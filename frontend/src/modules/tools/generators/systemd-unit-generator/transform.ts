import type { TransformResult } from "@/lib/tool-transform";
import type { SystemdUnitGeneratorOptions } from "./schema";

const KEYS = new Set(["description", "execstart", "execstop", "execreload", "user", "group", "workingdirectory", "environment", "environmentfile"]);
const CANON: Record<string, string> = { description: "Description", execstart: "ExecStart", execstop: "ExecStop", execreload: "ExecReload", user: "User", group: "Group", workingdirectory: "WorkingDirectory", environment: "Environment", environmentfile: "EnvironmentFile" };

/** Input: `Key=value` lines: Description, ExecStart (required), ExecStop, ExecReload, User, Group, WorkingDirectory, Environment (repeatable), EnvironmentFile. */
export function generateSystemdUnit(input: string, o: SystemdUnitGeneratorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const v: Record<string, string[]> = {};
  for (const [i, l] of lines.entries()) {
    const m = /^([A-Za-z]+)\s*=\s*(.*)$/.exec(l);
    if (!m) return { output: "", error: { message: 'Expected "Key=value"', line: i + 1 } };
    const k = m[1]!.toLowerCase();
    if (!KEYS.has(k)) return { output: "", error: { message: `Unsupported key "${m[1]}". Supported: ${Object.values(CANON).join(", ")}`, line: i + 1 } };
    (v[k] ??= []).push(m[2]!.trim());
  }
  if (!v.execstart) return { output: "", error: { message: "ExecStart= is required" } };
  const exe = v.execstart[0]!.replace(/^[-@:+!]+/, "").split(/\s+/)[0]!;
  if (!exe.startsWith("/")) return { output: "", error: { message: `ExecStart must use an absolute path (got "${exe}"); systemd does not search $PATH` } };
  const unit = ["[Unit]", `Description=${v.description?.[0] ?? "My service"}`];
  if (o.afterNetwork) unit.push("After=network-online.target", "Wants=network-online.target");
  const svc = ["[Service]", `Type=${o.type}`];
  for (const k of ["user", "group", "workingdirectory", "environment", "environmentfile", "execstart", "execreload", "execstop"]) for (const val of v[k] ?? []) svc.push(`${CANON[k]}=${val}`);
  if (o.restart !== "no" && o.type !== "oneshot") svc.push(`Restart=${o.restart}`, `RestartSec=${o.restartSec}`);
  if (o.type === "oneshot") svc.push("RemainAfterExit=yes");
  if (o.hardening) svc.push("NoNewPrivileges=true", "PrivateTmp=true", "ProtectSystem=strict", "ProtectHome=true", ...(v.workingdirectory ? [`ReadWritePaths=${v.workingdirectory[0]}`] : []));
  const out = [...unit, "", ...svc, "", "[Install]", `WantedBy=${o.wantedBy}`];
  const notes: string[] = [];
  if (!v.user) notes.push("# Note: no User= set, so the service runs as root.");
  if (o.hardening && o.type !== "oneshot") notes.push("# ProtectSystem=strict makes / read-only; list writable paths with ReadWritePaths=.");
  return { output: out.join("\n") + "\n" + (notes.length ? "\n" + notes.join("\n") + "\n" : "") + "\n# Install: sudo cp app.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now app\n", error: null };
}
