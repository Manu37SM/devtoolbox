import { dump, load } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { DockerComposeToKubernetesOptions } from "./schema";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const SECRET_KEY = /pass(word)?|secret|token|api[_-]?key|private[_-]?key|credential/i;

export const k8sName = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63) || "app";

export interface PortMap { published?: number; target: number; protocol: "TCP" | "UDP" }

export function parsePort(p: unknown): PortMap | null {
  if (isObj(p)) {
    const target = Number(p.target);
    if (!Number.isInteger(target)) return null;
    return { target, published: p.published !== undefined ? Number(p.published) : undefined, protocol: String(p.protocol ?? "tcp").toUpperCase() === "UDP" ? "UDP" : "TCP" };
  }
  const s = String(p);
  const [spec, proto] = s.split("/");
  if (/-/.test(spec!)) return null;
  const parts = spec!.split(":");
  const target = Number(parts[parts.length - 1]);
  const published = parts.length >= 2 ? Number(parts[parts.length - 2]) : undefined;
  if (!Number.isInteger(target)) return null;
  return { target, published: Number.isInteger(published) ? published : undefined, protocol: proto?.toUpperCase() === "UDP" ? "UDP" : "TCP" };
}

export function parseEnv(env: unknown): [string, string][] {
  if (Array.isArray(env)) return env.map((e) => { const s = String(e); const i = s.indexOf("="); return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)]; });
  if (isObj(env)) return Object.entries(env).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)]);
  return [];
}

export const cpu = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? (n >= 1 && Number.isInteger(n) ? String(n) : `${Math.round(n * 1000)}m`) : String(v); };
export const memory = (v: unknown) => {
  const m = /^(\d+(?:\.\d+)?)\s*([bkmgt])?b?$/i.exec(String(v).trim());
  if (!m) return String(v);
  const unit = (m[2] ?? "b").toLowerCase();
  return unit === "b" ? m[1]! : `${m[1]}${unit.toUpperCase()}i`;
};
const seconds = (v: unknown) => { const m = /^(\d+)(ms|s|m|h)?$/.exec(String(v)); if (!m) return undefined; const n = Number(m[1]); return m[2] === "m" ? n * 60 : m[2] === "h" ? n * 3600 : m[2] === "ms" ? Math.max(1, Math.round(n / 1000)) : n; };
/** Compose splits a string command into words (shell-style quoting), it does not run it through sh -c. */
export function shellWords(s: string): string[] {
  const out: string[] = [];
  let cur = "", q: string | null = null, has = false;
  for (const ch of s) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === '"' || ch === "'") { q = ch; has = true; }
    else if (/\s/.test(ch)) { if (cur || has) out.push(cur); cur = ""; has = false; }
    else cur += ch;
  }
  if (cur || has) out.push(cur);
  return out;
}
const cmdList = (v: unknown): string[] | undefined => (v === undefined || v === null ? undefined : Array.isArray(v) ? v.map(String) : shellWords(String(v)));

export function runDockerComposeToKubernetes(input: string, options: DockerComposeToKubernetesOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let doc: unknown;
  try { doc = load(input); } catch (e) { return { output: "", error: { message: `Invalid YAML: ${(e as Error).message.split("\n")[0]}` } }; }
  if (!isObj(doc) || !isObj(doc.services)) return { output: "", error: { message: "No services: block found. Paste a docker-compose.yml." } };
  const ns = options.namespace.trim() ? { namespace: k8sName(options.namespace) } : {};
  const docs: Obj[] = [];
  const notes: string[] = [];
  const namedVolumes = new Set<string>();

  for (const [rawName, svcRaw] of Object.entries(doc.services)) {
    if (!isObj(svcRaw)) continue;
    const svc = svcRaw;
    const name = k8sName(rawName);
    const labels = { app: name };
    const image = svc.image ? String(svc.image) : `${name}:latest`;
    if (!svc.image) notes.push(`${rawName}: uses build:, so image ${image} is a placeholder. Build and push it to a registry first.`);
    if (/:latest$|^[^:]+$/.test(image) && svc.image) notes.push(`${rawName}: image ${image} has no fixed tag; pin a version for reproducible rollouts.`);

    const ports = (Array.isArray(svc.ports) ? svc.ports : []).map(parsePort);
    if (ports.some((p) => p === null)) notes.push(`${rawName}: port ranges are not converted; list them individually.`);
    const valid = ports.filter((p): p is PortMap => p !== null);
    const exposed = (Array.isArray(svc.expose) ? svc.expose : []).map((e) => Number(String(e).split("/")[0])).filter(Number.isInteger);
    const containerPorts = [...new Set([...valid.map((p) => p.target), ...exposed])];

    const env = parseEnv(svc.environment);
    const secretEnv = options.secretsFromEnv ? env.filter(([k]) => SECRET_KEY.test(k)) : [];
    const plainEnv = env.filter((e) => !secretEnv.includes(e));
    if (svc.env_file) notes.push(`${rawName}: env_file is not inlined; create a ConfigMap/Secret from it (kubectl create configmap ${name}-env --from-env-file=...).`);

    const container: Obj = { name, image };
    const command = cmdList(svc.entrypoint);
    const args = cmdList(svc.command);
    if (command) container.command = command;
    if (args) container.args = args;
    if (containerPorts.length) container.ports = containerPorts.map((p) => ({ containerPort: p }));
    const envOut: Obj[] = plainEnv.map(([n, v]) => ({ name: n, value: v }));
    for (const [n] of secretEnv) envOut.push({ name: n, valueFrom: { secretKeyRef: { name: `${name}-secrets`, key: n } } });
    if (envOut.length) container.env = envOut;

    const deploy = isObj(svc.deploy) ? svc.deploy : {};
    const res = isObj(deploy.resources) ? deploy.resources : {};
    const limits = isObj(res.limits) ? res.limits : {};
    const reservations = isObj(res.reservations) ? res.reservations : {};
    const resources: Obj = {};
    const lim: Obj = {};
    if (limits.cpus !== undefined) lim.cpu = cpu(limits.cpus);
    if (limits.memory !== undefined) lim.memory = memory(limits.memory);
    const req: Obj = {};
    if (reservations.cpus !== undefined) req.cpu = cpu(reservations.cpus);
    if (reservations.memory !== undefined) req.memory = memory(reservations.memory);
    if (Object.keys(req).length) resources.requests = req;
    if (Object.keys(lim).length) resources.limits = lim;
    if (Object.keys(resources).length) container.resources = resources;
    else notes.push(`${rawName}: no deploy.resources; add requests/limits so the scheduler can place the pod.`);

    if (options.includeProbes && isObj(svc.healthcheck) && svc.healthcheck.disable !== true) {
      const hc = svc.healthcheck;
      const test = hc.test;
      let execCmd: string[] | undefined;
      if (Array.isArray(test)) {
        const t = test.map(String);
        if (t[0] === "CMD") execCmd = t.slice(1);
        else if (t[0] === "CMD-SHELL") execCmd = ["sh", "-c", t.slice(1).join(" ")];
      } else if (typeof test === "string") execCmd = ["sh", "-c", test];
      if (execCmd) {
        const probe: Obj = { exec: { command: execCmd } };
        const period = seconds(hc.interval); if (period) probe.periodSeconds = period;
        const timeout = seconds(hc.timeout); if (timeout) probe.timeoutSeconds = timeout;
        if (hc.retries !== undefined) probe.failureThreshold = Number(hc.retries);
        const start = seconds(hc.start_period); if (start) probe.initialDelaySeconds = start;
        container.readinessProbe = probe;
        container.livenessProbe = { ...probe };
      }
    }

    const volumeMounts: Obj[] = [];
    const volumes: Obj[] = [];
    for (const v of Array.isArray(svc.volumes) ? svc.volumes : []) {
      const spec = isObj(v) ? { source: String(v.source ?? ""), target: String(v.target ?? ""), ro: v.read_only === true } : (() => { const p = String(v).split(":"); return { source: p.length > 1 ? p[0]! : "", target: p.length > 1 ? p[1]! : p[0]!, ro: p[2] === "ro" }; })();
      if (!spec.source) { volumes.push({ name: `${name}-tmp-${volumes.length}`, emptyDir: {} }); volumeMounts.push({ name: `${name}-tmp-${volumes.length - 1}`, mountPath: spec.target }); continue; }
      if (/^[./~]/.test(spec.source)) { notes.push(`${rawName}: bind mount ${spec.source} -> ${spec.target} was skipped; use a ConfigMap, Secret or image layer instead.`); continue; }
      const claim = k8sName(spec.source);
      namedVolumes.add(claim);
      volumes.push({ name: claim, persistentVolumeClaim: { claimName: claim } });
      volumeMounts.push({ name: claim, mountPath: spec.target, ...(spec.ro ? { readOnly: true } : {}) });
    }
    if (volumeMounts.length) container.volumeMounts = volumeMounts;

    const replicas = deploy.replicas !== undefined ? Number(deploy.replicas) : 1;
    const podSpec: Obj = { containers: [container] };
    if (volumes.length) podSpec.volumes = volumes;
    if (namedVolumes.size && replicas > 1 && volumes.some((v) => "persistentVolumeClaim" in v)) notes.push(`${rawName}: ${replicas} replicas share a ReadWriteOnce volume; use a StatefulSet with volumeClaimTemplates instead.`);
    if (Array.isArray(svc.depends_on) || isObj(svc.depends_on)) notes.push(`${rawName}: depends_on has no Kubernetes equivalent; rely on readiness probes and retries.`);

    docs.push({ apiVersion: "apps/v1", kind: "Deployment", metadata: { name, ...ns, labels }, spec: { replicas, selector: { matchLabels: labels }, template: { metadata: { labels }, spec: podSpec } } });

    const svcPorts = valid.length ? valid.map((p) => ({ name: `${p.protocol.toLowerCase()}-${p.published ?? p.target}`, port: p.published ?? p.target, targetPort: p.target, ...(p.protocol === "UDP" ? { protocol: "UDP" } : {}) }))
      : exposed.map((p) => ({ name: `tcp-${p}`, port: p, targetPort: p }));
    if (svcPorts.length) docs.push({ apiVersion: "v1", kind: "Service", metadata: { name, ...ns, labels }, spec: { type: valid.length ? options.serviceType : "ClusterIP", selector: labels, ports: svcPorts } });

    if (secretEnv.length) docs.push({ apiVersion: "v1", kind: "Secret", metadata: { name: `${name}-secrets`, ...ns }, type: "Opaque", stringData: Object.fromEntries(secretEnv) });
  }
  for (const claim of namedVolumes) docs.push({ apiVersion: "v1", kind: "PersistentVolumeClaim", metadata: { name: claim, ...ns }, spec: { accessModes: ["ReadWriteOnce"], resources: { requests: { storage: "1Gi" } } } });
  if (docs.length === 0) return { output: "", error: { message: "No services could be converted." } };
  notes.push("This is a direct translation. Add securityContext, probes and resources, then check it with the Kubernetes Manifest Linter.");
  if (docs.some((d) => d.kind === "Secret")) notes.unshift("Secrets hold the values from your compose file in plain text (stringData). Do not commit them; use a secret manager or sealed-secrets.");
  const yaml = docs.map((d) => dump(d, { lineWidth: -1, noRefs: true })).join("---\n");
  return { output: `${notes.length ? `${notes.map((n) => `# ${n}`).join("\n")}\n` : ""}${yaml}`, error: null };
}
