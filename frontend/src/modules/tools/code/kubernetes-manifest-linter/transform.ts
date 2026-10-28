import { CORE_SCHEMA, loadAll, mergeTag } from "js-yaml";

const SCHEMA = CORE_SCHEMA.withTags(mergeTag);
import type { TransformResult } from "@/lib/tool-transform";
import type { KubernetesManifestLinterOptions } from "./schema";

type Sev = "error" | "warning" | "info";
export interface Finding { sev: Sev; doc: string; rule: string; msg: string }
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const DEPRECATED: Record<string, string> = {
  "extensions/v1beta1": "removed in Kubernetes 1.22; use apps/v1 or networking.k8s.io/v1",
  "apps/v1beta1": "removed in Kubernetes 1.16; use apps/v1",
  "apps/v1beta2": "removed in Kubernetes 1.16; use apps/v1",
  "networking.k8s.io/v1beta1": "removed in Kubernetes 1.22; use networking.k8s.io/v1",
  "policy/v1beta1": "removed in Kubernetes 1.25; PodSecurityPolicy is gone, use Pod Security Admission",
  "batch/v1beta1": "CronJob batch/v1beta1 was removed in Kubernetes 1.25; use batch/v1",
  "autoscaling/v2beta1": "removed in Kubernetes 1.25; use autoscaling/v2",
  "autoscaling/v2beta2": "removed in Kubernetes 1.26; use autoscaling/v2",
  "rbac.authorization.k8s.io/v1beta1": "removed in Kubernetes 1.22; use rbac.authorization.k8s.io/v1",
};

function podSpecOf(doc: Obj): { spec: Obj; labels: Obj | undefined } | null {
  const kind = doc.kind as string;
  const spec = doc.spec as Obj | undefined;
  if (!isObj(spec)) return null;
  if (kind === "Pod") return { spec, labels: (doc.metadata as Obj | undefined)?.labels as Obj | undefined };
  if (["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet", "Job"].includes(kind)) { const t = spec.template as Obj | undefined; return isObj(t) && isObj(t.spec) ? { spec: t.spec, labels: (t.metadata as Obj | undefined)?.labels as Obj | undefined } : null; }
  if (kind === "CronJob") { const t = ((spec.jobTemplate as Obj | undefined)?.spec as Obj | undefined)?.template as Obj | undefined; return isObj(t) && isObj(t.spec) ? { spec: t.spec, labels: undefined } : null; }
  return null;
}

export function lintDocument(doc: Obj, name: string, o: KubernetesManifestLinterOptions): Finding[] {
  const out: Finding[] = [];
  const add = (sev: Sev, rule: string, msg: string) => out.push({ sev, doc: name, rule, msg });
  const kind = String(doc.kind ?? "");
  const api = String(doc.apiVersion ?? "");
  if (!api || !kind) add("error", "KL001", "missing apiVersion or kind");
  if (DEPRECATED[api]) add("error", "KL002", `apiVersion ${api} ${DEPRECATED[api]}`);
  if (kind === "PodSecurityPolicy") add("error", "KL002", "PodSecurityPolicy was removed in Kubernetes 1.25");
  const meta = doc.metadata as Obj | undefined;
  if (!meta?.name && !meta?.generateName) add("error", "KL003", "metadata.name is required");
  const ps = podSpecOf(doc);
  if (kind === "Deployment" || kind === "StatefulSet" || kind === "DaemonSet" || kind === "ReplicaSet") {
    const sel = ((doc.spec as Obj).selector as Obj | undefined)?.matchLabels as Obj | undefined;
    if (!sel) add("error", "KL004", "spec.selector.matchLabels is required");
    else if (ps?.labels) { const bad = Object.entries(sel).filter(([k, v]) => ps.labels![k] !== v); if (bad.length) add("error", "KL005", `selector labels (${bad.map(([k]) => k).join(", ")}) do not match the pod template labels`); }
    else if (ps) add("error", "KL005", "pod template has no labels, so the selector cannot match");
    if (o.reliabilityChecks && kind === "Deployment" && (doc.spec as Obj).replicas === 1) add("info", "KL020", "replicas: 1 gives no redundancy or zero-downtime rollouts");
  }
  if (!ps) {
    if (kind === "Service") {
      const s = doc.spec as Obj | undefined;
      if (s?.type !== "ExternalName" && !s?.selector) add("warning", "KL030", "Service has no selector; it will have no endpoints unless you manage them manually");
      if (s?.type === "LoadBalancer") add("info", "KL031", "type LoadBalancer provisions a public cloud load balancer; check annotations for internal/private exposure");
      if (s?.type === "NodePort") add("info", "KL032", "NodePort exposes a port on every node");
    }
    if (kind === "Ingress" && o.securityChecks && !arr((doc.spec as Obj | undefined)?.tls).length) add("warning", "KL033", "Ingress has no TLS section");
    if (kind === "Secret" && o.securityChecks && (isObj(doc.data) || isObj(doc.stringData))) add("warning", "KL034", "Secret values are committed in the manifest; use sealed-secrets, external-secrets or a CSI driver");
    if (["ClusterRoleBinding", "RoleBinding"].includes(kind) && o.securityChecks && arr(doc.subjects).some((s) => isObj(s) && s.name === "system:anonymous")) add("error", "KL035", "binding grants permissions to system:anonymous");
    if (["Role", "ClusterRole"].includes(kind) && o.securityChecks && arr(doc.rules).some((r) => isObj(r) && arr(r.verbs).includes("*") && arr(r.resources).includes("*"))) add("error", "KL036", 'rule grants verbs ["*"] on resources ["*"]');
    return out;
  }
  const spec = ps.spec;
  if (o.securityChecks) {
    if (spec.hostNetwork === true) add("warning", "KL040", "hostNetwork: true shares the node's network namespace");
    if (spec.hostPID === true || spec.hostIPC === true) add("error", "KL041", "hostPID/hostIPC share the node's process or IPC namespace");
    for (const v of arr(spec.volumes)) if (isObj(v) && isObj(v.hostPath)) add("warning", "KL042", `volume "${String(v.name)}" mounts hostPath ${String((v.hostPath as Obj).path)}`);
    if (spec.automountServiceAccountToken !== false && !spec.serviceAccountName) add("info", "KL043", "uses the default ServiceAccount with its token auto-mounted; set automountServiceAccountToken: false if the app does not call the API");
  }
  const podSc = (spec.securityContext as Obj | undefined) ?? {};
  const containers = [...arr(spec.containers).map((c) => ["container", c] as const), ...arr(spec.initContainers).map((c) => ["initContainer", c] as const)];
  if (!containers.length) add("error", "KL010", "no containers defined");
  for (const [type, c] of containers) {
    if (!isObj(c)) continue;
    const cn = `${type} "${String(c.name ?? "?")}"`;
    const image = String(c.image ?? "");
    if (!image) add("error", "KL011", `${cn}: image is missing`);
    else {
      const ref = image.split("@")[0]!;
      const last = ref.split("/").pop()!;
      const tag = last.includes(":") ? last.split(":")[1] : undefined;
      if (!image.includes("@sha256:")) {
        if (!tag) add("warning", "KL012", `${cn}: image "${image}" has no tag, which means :latest`);
        else if (tag === "latest") add("warning", "KL012", `${cn}: image tag :latest is mutable and breaks reproducible rollouts`);
      }
    }
    if (o.reliabilityChecks) {
      const r = c.resources as Obj | undefined;
      if (!r?.limits || !(r.limits as Obj).memory) add("warning", "KL013", `${cn}: no memory limit; one leak can take the node down`);
      if (!r?.requests) add("warning", "KL014", `${cn}: no resource requests; the scheduler cannot place pods well`);
      if (type === "container" && !["Job", "CronJob"].includes(kind)) {
        if (!c.readinessProbe) add("warning", "KL015", `${cn}: no readinessProbe; traffic may reach the pod before it is ready`);
        if (!c.livenessProbe && !c.startupProbe) add("info", "KL016", `${cn}: no livenessProbe or startupProbe`);
      }
    }
    if (o.securityChecks) {
      const sc = (c.securityContext as Obj | undefined) ?? {};
      if (sc.privileged === true) add("error", "KL050", `${cn}: privileged: true gives root-equivalent access to the node`);
      if (sc.allowPrivilegeEscalation !== false) add("warning", "KL051", `${cn}: allowPrivilegeEscalation is not false`);
      if (sc.runAsNonRoot !== true && podSc.runAsNonRoot !== true && !(typeof (sc.runAsUser ?? podSc.runAsUser) === "number" && (sc.runAsUser ?? podSc.runAsUser) !== 0)) add("warning", "KL052", `${cn}: not forced to run as non-root (set runAsNonRoot: true)`);
      if (sc.runAsUser === 0) add("error", "KL053", `${cn}: runAsUser: 0 runs as root`);
      if (sc.readOnlyRootFilesystem !== true) add("info", "KL054", `${cn}: readOnlyRootFilesystem is not true`);
      const drops = arr((sc.capabilities as Obj | undefined)?.drop).map(String);
      if (!drops.some((d) => d.toUpperCase() === "ALL")) add("info", "KL055", `${cn}: capabilities.drop does not include ALL`);
      const adds = arr((sc.capabilities as Obj | undefined)?.add).map(String);
      if (adds.some((a) => ["SYS_ADMIN", "NET_ADMIN", "ALL"].includes(a.toUpperCase()))) add("error", "KL056", `${cn}: adds dangerous capability ${adds.join(", ")}`);
      for (const e of arr(c.env)) if (isObj(e) && typeof e.value === "string" && /pass(word)?|secret|token|api[_-]?key|private[_-]?key/i.test(String(e.name)) && e.value !== "") add("warning", "KL057", `${cn}: env ${String(e.name)} holds a literal value; use valueFrom.secretKeyRef`);
    }
  }
  return out;
}

export function runK8sLint(input: string, o: KubernetesManifestLinterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let docs: unknown[];
  try { docs = loadAll(input, { schema: SCHEMA }); } catch (e) { const err = e as Error & { mark?: { line: number; column: number } }; return { output: "", error: { message: `YAML error: ${err.message.split("\n")[0]}`, ...(err.mark ? { line: err.mark.line + 1, column: err.mark.column + 1 } : {}) } }; }
  const findings: Finding[] = [];
  let count = 0;
  docs.forEach((d, i) => {
    if (d === null || d === undefined) return;
    count++;
    if (!isObj(d)) { findings.push({ sev: "error", doc: `document ${i + 1}`, rule: "KL001", msg: "document is not a mapping" }); return; }
    const name = `${String(d.kind ?? "?")}/${String((d.metadata as Obj | undefined)?.name ?? "?")}`;
    findings.push(...lintDocument(d, name, o));
  });
  if (!count) return { output: "", error: null };
  const rank = { info: 0, warning: 1, error: 2 };
  const shown = findings.filter((f) => rank[f.sev] >= rank[o.minSeverity]).sort((a, b) => rank[b.sev] - rank[a.sev]);
  const e = findings.filter((f) => f.sev === "error").length, w = findings.filter((f) => f.sev === "warning").length, n = findings.filter((f) => f.sev === "info").length;
  const head = `${count} resource${count === 1 ? "" : "s"}: ${e} error${e === 1 ? "" : "s"}, ${w} warning${w === 1 ? "" : "s"}, ${n} note${n === 1 ? "" : "s"}`;
  if (!shown.length) return { output: `${head}\n\n✓ Nothing to report at this severity.`, error: null };
  const icon = { error: "✗", warning: "⚠", info: "ℹ" };
  return { output: [head, "", ...shown.map((f) => `${icon[f.sev]} ${f.rule} ${f.doc}: ${f.msg}`)].join("\n"), error: null };
}
