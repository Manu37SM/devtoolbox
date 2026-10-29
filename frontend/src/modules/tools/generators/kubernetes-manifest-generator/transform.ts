import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { KubernetesManifestGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;
export function fields(input: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const r = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (r && r[2]!.trim()) m.set(r[1]!.toLowerCase(), r[2]!.trim()); }
  return m;
}
const dns = (s: string) => s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63);
const pairs = (s: string | undefined) => (s ?? "").split(/[;,]/).map((p) => p.trim()).filter(Boolean).map((p) => { const i = p.indexOf("="); return i < 0 ? [p, ""] : [p.slice(0, i).trim(), p.slice(i + 1).trim()]; }) as [string, string][];

export function build(f: Map<string, string>, o: KubernetesManifestGeneratorOptions): { docs: Obj[]; notes: string[] } {
  const notes: string[] = [];
  const name = dns(f.get("name") ?? "app");
  const image = f.get("image") ?? `registry.example.com/${name}:1.0.0`;
  if (!/:[^/]+$/.test(image) || /:latest$/.test(image)) notes.push(`Image ${image} has no fixed tag; pin a version (or a digest) so rollouts are reproducible.`);
  const port = Number(f.get("port") ?? (o.springBoot ? 8080 : 8080));
  const ns = f.get("namespace") ? { namespace: dns(f.get("namespace")!) } : {};
  const labels = { "app.kubernetes.io/name": name, ...(f.get("version") ? { "app.kubernetes.io/version": f.get("version")! } : {}) };
  const selector = { "app.kubernetes.io/name": name };
  const replicas = Number(f.get("replicas") ?? 2);

  const env: Obj[] = pairs(f.get("env")).map(([k, v]) => ({ name: k, value: v }));
  if (o.springBoot && !env.some((e) => e.name === "JAVA_TOOL_OPTIONS")) env.push({ name: "JAVA_TOOL_OPTIONS", value: "-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError" });
  for (const s of (f.get("secret-env") ?? "").split(/[;,]/).map((x) => x.trim()).filter(Boolean)) env.push({ name: s, valueFrom: { secretKeyRef: { name: `${name}-secrets`, key: s } } });

  const live = f.get("liveness-path") ?? (o.springBoot ? "/actuator/health/liveness" : f.get("health-path") ?? "/healthz");
  const ready = f.get("readiness-path") ?? (o.springBoot ? "/actuator/health/readiness" : f.get("health-path") ?? "/healthz");
  const container: Obj = {
    name,
    image,
    imagePullPolicy: "IfNotPresent",
    ports: [{ name: "http", containerPort: port }],
    ...(env.length ? { env } : {}),
    resources: {
      requests: { cpu: f.get("cpu-request") ?? "250m", memory: f.get("memory-request") ?? (o.springBoot ? "512Mi" : "128Mi") },
      limits: { memory: f.get("memory-limit") ?? (o.springBoot ? "768Mi" : "256Mi"), ...(f.get("cpu-limit") ? { cpu: f.get("cpu-limit") } : {}) },
    },
    ...(o.springBoot ? { startupProbe: { httpGet: { path: live, port: "http" }, periodSeconds: 5, failureThreshold: 30 } } : {}),
    livenessProbe: { httpGet: { path: live, port: "http" }, periodSeconds: 10, failureThreshold: 3 },
    readinessProbe: { httpGet: { path: ready, port: "http" }, periodSeconds: 5, failureThreshold: 3 },
    securityContext: { runAsNonRoot: true, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ["ALL"] } },
    volumeMounts: [{ name: "tmp", mountPath: "/tmp" }],
  };
  if (!f.get("cpu-limit")) notes.push("No CPU limit on purpose: CPU limits cause throttling; the request reserves capacity. Set cpu-limit: if your platform requires one.");
  if (o.springBoot) notes.push("Spring Boot exposes /actuator/health/liveness and /readiness when management.endpoint.health.probes.enabled=true (automatic on Kubernetes since Boot 2.3).");

  const docs: Obj[] = [{
    apiVersion: "apps/v1", kind: "Deployment", metadata: { name, ...ns, labels },
    spec: {
      replicas, revisionHistoryLimit: 5, selector: { matchLabels: selector },
      strategy: { type: "RollingUpdate", rollingUpdate: { maxSurge: 1, maxUnavailable: 0 } },
      template: {
        metadata: { labels },
        spec: {
          automountServiceAccountToken: false,
          securityContext: { runAsNonRoot: true, seccompProfile: { type: "RuntimeDefault" } },
          terminationGracePeriodSeconds: 30,
          containers: [container],
          volumes: [{ name: "tmp", emptyDir: {} }],
        },
      },
    },
  }];
  if (o.service) docs.push({ apiVersion: "v1", kind: "Service", metadata: { name, ...ns, labels }, spec: { type: "ClusterIP", selector, ports: [{ name: "http", port: 80, targetPort: "http" }] } });
  if (o.ingress) {
    const host = f.get("host") ?? `${name}.example.com`;
    docs.push({
      apiVersion: "networking.k8s.io/v1", kind: "Ingress", metadata: { name, ...ns, labels },
      spec: {
        ingressClassName: f.get("ingress-class") ?? "nginx",
        tls: [{ hosts: [host], secretName: `${name}-tls` }],
        rules: [{ host, http: { paths: [{ path: f.get("path") ?? "/", pathType: "Prefix", backend: { service: { name, port: { name: "http" } } } }] } }],
      },
    });
    if (!o.service) notes.push("The Ingress points at a Service that is not generated.");
  }
  if (o.hpa) {
    const min = Number(f.get("min-replicas") ?? replicas), max = Number(f.get("max-replicas") ?? Math.max(replicas * 3, min + 1));
    docs.push({ apiVersion: "autoscaling/v2", kind: "HorizontalPodAutoscaler", metadata: { name, ...ns, labels }, spec: { scaleTargetRef: { apiVersion: "apps/v1", kind: "Deployment", name }, minReplicas: min, maxReplicas: max, metrics: [{ type: "Resource", resource: { name: "cpu", target: { type: "Utilization", averageUtilization: Number(f.get("cpu-target") ?? 70) } } }] } });
    notes.push("With an HPA, remove replicas from the Deployment in GitOps setups so applies do not fight the autoscaler.");
  }
  if (o.pdb) {
    if (replicas < 2) notes.push("A PodDisruptionBudget with one replica blocks node drains; run at least two replicas.");
    docs.push({ apiVersion: "policy/v1", kind: "PodDisruptionBudget", metadata: { name, ...ns, labels }, spec: { minAvailable: 1, selector: { matchLabels: selector } } });
  }
  if (env.some((e) => "valueFrom" in e)) notes.push(`Create the Secret first: kubectl create secret generic ${name}-secrets --from-literal=KEY=value (or use External Secrets / Sealed Secrets).`);
  return { docs, notes };
}

export function runKubernetesManifestGenerator(input: string, options: KubernetesManifestGeneratorOptions): TransformResult {
  const { docs, notes } = build(fields(input), options);
  return { output: `${notes.map((n) => `# ${n}`).join("\n")}\n${docs.map((d) => dump(d, { lineWidth: -1, noRefs: true })).join("---\n")}`, error: null };
}
