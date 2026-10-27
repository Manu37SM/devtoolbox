import { dump as dumpYaml } from "js-yaml";
import { tokenize } from "@/lib/shell-tokenize";
import type { TransformResult } from "@/lib/tool-transform";
import type { DockerRunToComposeOptions } from "./schema";

const VALUE_FLAGS = new Set([
  "-p", "--publish", "-v", "--volume", "-e", "--env", "--env-file", "--name", "--network", "--net", "--restart",
  "-w", "--workdir", "-u", "--user", "--entrypoint", "-h", "--hostname", "--cap-add", "--cap-drop", "-m", "--memory",
  "--cpus", "-l", "--label", "--add-host", "--dns", "--platform", "--pull", "--health-cmd", "--health-interval",
  "--health-timeout", "--health-retries", "--log-driver", "--log-opt", "--mount", "--device", "--ulimit", "--shm-size",
  "--ip", "--link", "--expose", "--stop-signal", "--group-add", "--security-opt", "--tmpfs", "--sysctl", "--pid",
  "--ipc", "--runtime", "--cpuset-cpus", "--memory-swap", "--label-file", "-a", "--attach", "--detach-keys",
]);
const BOOLEAN_SHORT = new Set(["d", "i", "t", "P"]);

export interface ParsedDockerRun {
  image: string;
  command: string[];
  flags: Map<string, string[]>;
  booleans: Set<string>;
}

const alias: Record<string, string> = {
  "-p": "--publish", "-v": "--volume", "-e": "--env", "-w": "--workdir", "-u": "--user", "-h": "--hostname",
  "-m": "--memory", "-l": "--label", "--net": "--network", "-a": "--attach",
};

export function parseDockerRun(command: string): ParsedDockerRun {
  const tokens = tokenize(command.trim());
  let i = 0;
  if (tokens[i]?.toLowerCase() === "sudo") i++;
  if (tokens[i]?.toLowerCase() !== "docker") throw new Error("The command must start with “docker run”.");
  i++;
  if (tokens[i] === "container") i++;
  if (tokens[i] !== "run") throw new Error("Only “docker run” commands can be converted.");
  i++;

  const flags = new Map<string, string[]>();
  const booleans = new Set<string>();
  const add = (flag: string, value: string) => {
    const key = alias[flag] ?? flag;
    flags.set(key, [...(flags.get(key) ?? []), value]);
  };

  for (; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (!t.startsWith("-") || t === "-") break;
    if (t.startsWith("--")) {
      const eq = t.indexOf("=");
      const name = eq === -1 ? t : t.slice(0, eq);
      if (VALUE_FLAGS.has(name) || (!booleanLong(name) && eq !== -1)) {
        const value = eq !== -1 ? t.slice(eq + 1) : tokens[++i];
        if (value === undefined) throw new Error(`Flag ${name} expects a value.`);
        add(name, value);
      } else {
        booleans.add(alias[name] ?? name);
      }
      continue;
    }
    // Short flags, possibly bundled: -dit, -p80:80, -eFOO=bar
    for (let c = 1; c < t.length; c++) {
      const ch = t[c]!;
      const flag = `-${ch}`;
      if (VALUE_FLAGS.has(flag)) {
        const rest = t.slice(c + 1);
        const value = rest !== "" ? rest : tokens[++i];
        if (value === undefined) throw new Error(`Flag ${flag} expects a value.`);
        add(flag, value);
        break;
      }
      if (BOOLEAN_SHORT.has(ch)) booleans.add(flag);
    }
  }

  const image = tokens[i];
  if (image === undefined) throw new Error("No image found after the flags.");
  return { image, command: tokens.slice(i + 1), flags, booleans };
}

function booleanLong(name: string): boolean {
  return ["--rm", "--privileged", "--init", "--read-only", "--detach", "--interactive", "--tty", "--publish-all", "--no-healthcheck", "--oom-kill-disable", "--sig-proxy"].includes(name);
}

const isBindSource = (src: string) => /^([./~]|[A-Za-z]:[\\/])/.test(src);

export function toCompose(run: ParsedDockerRun): { yaml: string; skipped: string[] } {
  const f = (k: string) => run.flags.get(k) ?? [];
  const svc: Record<string, unknown> = {};
  const skipped: string[] = [];
  const topVolumes = new Set<string>();
  const topNetworks = new Set<string>();

  svc.image = run.image;
  const name = f("--name")[0];
  if (name) svc.container_name = name;
  if (run.command.length) svc.command = run.command.length === 1 ? run.command[0] : run.command;
  const entrypoint = f("--entrypoint")[0];
  if (entrypoint !== undefined) svc.entrypoint = tokenize(entrypoint);
  if (f("--publish").length) svc.ports = f("--publish");
  if (f("--expose").length) svc.expose = f("--expose");
  if (f("--volume").length) {
    svc.volumes = f("--volume");
    for (const v of f("--volume")) {
      const src = v.split(":")[0]!;
      if (src && v.includes(":") && !isBindSource(src)) topVolumes.add(src);
    }
  }
  if (f("--tmpfs").length) svc.tmpfs = f("--tmpfs");
  if (f("--env").length) svc.environment = f("--env");
  if (f("--env-file").length) svc.env_file = f("--env-file");

  const network = f("--network")[0];
  if (network) {
    if (["host", "none"].includes(network) || network.startsWith("container:")) svc.network_mode = network;
    else if (network !== "bridge") {
      svc.networks = [network];
      topNetworks.add(network);
    }
  }
  const restart = f("--restart")[0];
  if (restart) svc.restart = restart;
  if (f("--workdir")[0]) svc.working_dir = f("--workdir")[0];
  if (f("--user")[0]) svc.user = f("--user")[0];
  if (f("--hostname")[0]) svc.hostname = f("--hostname")[0];
  if (f("--cap-add").length) svc.cap_add = f("--cap-add");
  if (f("--cap-drop").length) svc.cap_drop = f("--cap-drop");
  if (f("--memory")[0]) svc.mem_limit = f("--memory")[0];
  if (f("--cpus")[0]) svc.cpus = Number(f("--cpus")[0]);
  if (f("--label").length) svc.labels = f("--label");
  if (f("--add-host").length) svc.extra_hosts = f("--add-host");
  if (f("--dns").length) svc.dns = f("--dns");
  if (f("--platform")[0]) svc.platform = f("--platform")[0];
  if (f("--device").length) svc.devices = f("--device");
  if (f("--security-opt").length) svc.security_opt = f("--security-opt");
  if (f("--shm-size")[0]) svc.shm_size = f("--shm-size")[0];
  if (f("--stop-signal")[0]) svc.stop_signal = f("--stop-signal")[0];
  if (f("--health-cmd")[0]) {
    const hc: Record<string, unknown> = { test: ["CMD-SHELL", f("--health-cmd")[0]] };
    if (f("--health-interval")[0]) hc.interval = f("--health-interval")[0];
    if (f("--health-timeout")[0]) hc.timeout = f("--health-timeout")[0];
    if (f("--health-retries")[0]) hc.retries = Number(f("--health-retries")[0]);
    svc.healthcheck = hc;
  }
  if (run.booleans.has("--privileged")) svc.privileged = true;
  if (run.booleans.has("--init")) svc.init = true;
  if (run.booleans.has("--read-only")) svc.read_only = true;
  if (run.booleans.has("-t") || run.booleans.has("--tty")) svc.tty = true;
  if (run.booleans.has("-i") || run.booleans.has("--interactive")) svc.stdin_open = true;

  const handled = new Set([
    "--name", "--entrypoint", "--publish", "--expose", "--volume", "--tmpfs", "--env", "--env-file", "--network", "--restart",
    "--workdir", "--user", "--hostname", "--cap-add", "--cap-drop", "--memory", "--cpus", "--label", "--add-host", "--dns",
    "--platform", "--device", "--security-opt", "--shm-size", "--stop-signal", "--health-cmd", "--health-interval",
    "--health-timeout", "--health-retries",
  ]);
  for (const k of run.flags.keys()) if (!handled.has(k)) skipped.push(k);
  for (const b of run.booleans) {
    if (!["--privileged", "--init", "--read-only", "-t", "--tty", "-i", "--interactive", "-d", "--detach", "--rm"].includes(b)) skipped.push(b);
  }
  if (run.booleans.has("--rm")) skipped.push("--rm (Compose has no equivalent; use `docker compose run --rm`)");

  const serviceName = (name ?? run.image.split("/").pop()!.split(":")[0]!.split("@")[0]!).replace(/[^A-Za-z0-9_.-]/g, "-") || "app";
  const doc: Record<string, unknown> = { services: { [serviceName]: svc } };
  if (topVolumes.size) doc.volumes = Object.fromEntries(Array.from(topVolumes, (v) => [v, {}]));
  if (topNetworks.size) doc.networks = Object.fromEntries(Array.from(topNetworks, (n) => [n, { external: true }]));
  return { yaml: dumpYaml(doc, { indent: 2, lineWidth: -1, noRefs: true }), skipped };
}

export function convertDockerRun(input: string, _options: DockerRunToComposeOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    const { yaml, skipped } = toCompose(parseDockerRun(input));
    const note = skipped.length ? `# Not converted: ${skipped.join(", ")}\n` : "";
    return { output: note + yaml, error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the docker run command." } };
  }
}
