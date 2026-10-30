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

const SECRET_KEY = /(PASS(WORD|WD)?|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY|CREDENTIALS?|AUTH)/i;

interface ServiceBuild {
  name: string;
  svc: Record<string, unknown>;
  skipped: string[];
  volumes: Set<string>;
  networks: Set<string>;
  secrets: [string, string][];
}

function buildService(run: ParsedDockerRun, o: Partial<DockerRunToComposeOptions>): ServiceBuild {
  const f = (k: string) => run.flags.get(k) ?? [];
  const svc: Record<string, unknown> = {};
  const skipped: string[] = [];
  const topVolumes = new Set<string>();
  const topNetworks = new Set<string>();

  svc.image = run.image;
  const name = f("--name")[0];
  if (name && (o.containerName ?? true)) svc.container_name = name;
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
  const secrets: [string, string][] = [];
  if (f("--env").length) {
    const entries = f("--env").map((e) => {
      const eq = e.indexOf("=");
      return eq === -1 ? ([e, null] as const) : ([e.slice(0, eq), e.slice(eq + 1)] as const);
    });
    const env = entries.map(([k, v]) => {
      if (v !== null && o.extractSecrets && SECRET_KEY.test(k)) {
        secrets.push([k, v]);
        return [k, `\${${k}}`] as const;
      }
      return [k, v] as const;
    });
    svc.environment =
      o.envStyle === "map"
        ? Object.fromEntries(env.map(([k, v]) => [k, v ?? null]))
        : env.map(([k, v]) => (v === null ? k : `${k}=${v}`));
  }
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
  if (f("--log-driver")[0] || f("--log-opt").length) {
    const logging: Record<string, unknown> = {};
    if (f("--log-driver")[0]) logging.driver = f("--log-driver")[0];
    if (f("--log-opt").length) logging.options = Object.fromEntries(f("--log-opt").map((x) => x.split(/=(.*)/s).slice(0, 2)));
    svc.logging = logging;
  }
  if (f("--ulimit").length) {
    svc.ulimits = Object.fromEntries(
      f("--ulimit").map((u) => {
        const [k, v = ""] = u.split("=");
        const [soft, hard] = v.split(":");
        return [k, hard !== undefined ? { soft: Number(soft), hard: Number(hard) } : Number(soft)];
      }),
    );
  }
  if (f("--sysctl").length) svc.sysctls = Object.fromEntries(f("--sysctl").map((x) => x.split(/=(.*)/s).slice(0, 2)));
  if (f("--pid")[0]) svc.pid = f("--pid")[0];
  if (f("--ipc")[0]) svc.ipc = f("--ipc")[0];
  if (f("--runtime")[0]) svc.runtime = f("--runtime")[0];
  if (f("--group-add").length) svc.group_add = f("--group-add");
  if (f("--cpuset-cpus")[0]) svc.cpuset = f("--cpuset-cpus")[0];
  if (f("--memory-swap")[0]) svc.memswap_limit = f("--memory-swap")[0];
  if (f("--link").length) svc.links = f("--link");
  if (f("--pull")[0]) svc.pull_policy = f("--pull")[0];
  if (f("--mount").length) {
    // --mount type=bind,source=./data,target=/data,readonly -> long volume syntax
    const mounts = f("--mount").map((m) => {
      const kv = Object.fromEntries(m.split(",").map((p) => (p.includes("=") ? p.split(/=(.*)/s).slice(0, 2) : [p, "true"])));
      const v: Record<string, unknown> = { type: kv.type ?? "volume" };
      const src = kv.source ?? kv.src;
      if (src) {
        v.source = src;
        if (v.type === "volume") topVolumes.add(src);
      }
      v.target = kv.target ?? kv.destination ?? kv.dst;
      if (kv.readonly === "true" || kv.ro === "true") v.read_only = true;
      return v;
    });
    svc.volumes = [...((svc.volumes as unknown[] | undefined) ?? []), ...mounts];
  }
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
    "--health-timeout", "--health-retries", "--log-driver", "--log-opt", "--ulimit", "--sysctl", "--pid", "--ipc", "--runtime",
    "--group-add", "--cpuset-cpus", "--memory-swap", "--link", "--pull", "--mount",
  ]);
  for (const k of run.flags.keys()) if (!handled.has(k)) skipped.push(k);
  for (const b of run.booleans) {
    if (!["--privileged", "--init", "--read-only", "-t", "--tty", "-i", "--interactive", "-d", "--detach", "--rm"].includes(b)) skipped.push(b);
  }
  if (run.booleans.has("--rm")) skipped.push("--rm (Compose has no equivalent; use `docker compose run --rm`)");

  const serviceName =
    (o.serviceName?.trim() || name || run.image.split("/").pop()!.split(":")[0]!.split("@")[0]!).replace(/[^A-Za-z0-9_.-]/g, "-") || "app";
  return { name: serviceName, svc, skipped, volumes: topVolumes, networks: topNetworks, secrets };
}

function assemble(builds: ServiceBuild[], o: Partial<DockerRunToComposeOptions>): { yaml: string; skipped: string[]; secrets: [string, string][] } {
  const services: Record<string, unknown> = {};
  for (const b of builds) {
    let key = b.name;
    for (let n = 2; key in services; n++) key = `${b.name}-${n}`;
    services[key] = b.svc;
  }
  const doc: Record<string, unknown> = { services };
  const vols = new Set(builds.flatMap((b) => [...b.volumes]));
  const nets = new Set(builds.flatMap((b) => [...b.networks]));
  if (vols.size) doc.volumes = Object.fromEntries(Array.from(vols, (v) => [v, {}]));
  if (nets.size) doc.networks = Object.fromEntries(Array.from(nets, (n) => [n, (o.externalNetworks ?? true) ? { external: true } : {}]));
  return {
    yaml: dumpYaml(doc, { indent: 2, lineWidth: -1, noRefs: true }),
    skipped: builds.flatMap((b) => b.skipped),
    secrets: builds.flatMap((b) => b.secrets),
  };
}

export function toCompose(run: ParsedDockerRun, options: Partial<DockerRunToComposeOptions> = {}): { yaml: string; skipped: string[] } {
  const { yaml, skipped } = assemble([buildService(run, options)], options);
  return { yaml, skipped };
}

/** Splits pasted text into separate `docker run` commands, keeping backslash/backtick continuations together. */
export function splitCommands(input: string): string[] {
  const joined = input.replace(/[\\`^]\r?\n/g, " ");
  return joined
    .split(/\r?\n|&&|;/)
    .map((l) => l.trim())
    .filter((l) => /^(sudo\s+)?docker\s+(container\s+)?run\b/i.test(l));
}

export function convertDockerRun(input: string, options: Partial<DockerRunToComposeOptions> = {}): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    const cmds = splitCommands(input);
    const builds =
      cmds.length > 1
        ? cmds.map((c) => buildService(parseDockerRun(c), { ...options, serviceName: "" }))
        : [buildService(parseDockerRun(input), options)];
    const { yaml, skipped, secrets } = assemble(builds, options);
    const note = skipped.length ? `# Not converted: ${skipped.join(", ")}\n` : "";
    const env = secrets.length
      ? `\n# .env (keep out of version control)\n${secrets.map(([k, v]) => `# ${k}=${v}`).join("\n")}\n`
      : "";
    return { output: note + yaml + env, error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the docker run command." } };
  }
}
