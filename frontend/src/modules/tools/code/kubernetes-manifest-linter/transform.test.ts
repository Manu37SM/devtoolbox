import { describe, expect, it } from "vitest";
import { runK8sLint } from "./transform";

const o = { minSeverity: "info" as const, securityChecks: true, reliabilityChecks: true };

const good = `apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 3
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: web } }
    spec:
      automountServiceAccountToken: false
      containers:
        - name: web
          image: registry.example.com/web:1.4.2
          resources: { requests: { cpu: 100m, memory: 128Mi }, limits: { memory: 256Mi } }
          readinessProbe: { httpGet: { path: /ready, port: 8080 } }
          livenessProbe: { httpGet: { path: /live, port: 8080 } }
          securityContext:
            runAsNonRoot: true
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities: { drop: [ALL] }
`;

describe("runK8sLint", () => {
  it("passes a hardened deployment", () => {
    const r = runK8sLint(good, o).output;
    expect(r).toContain("1 resource: 0 errors, 0 warnings, 0 notes");
    expect(r).toContain("Nothing to report");
  });
  it("flags a sloppy deployment", () => {
    const bad = `apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 1
  selector: { matchLabels: { app: web } }
  template:
    metadata: { labels: { app: other } }
    spec:
      hostNetwork: true
      containers:
        - name: web
          image: nginx:latest
          env: [{ name: DB_PASSWORD, value: hunter2 }]
          securityContext: { privileged: true }
`;
    const r = runK8sLint(bad, o).output;
    for (const s of ["KL005", "KL012", "KL013", "KL014", "KL015", "KL040", "KL050", "KL051", "KL052", "KL057", "KL020"]) expect(r, s).toContain(s);
    expect(r.indexOf("✗")).toBeLessThan(r.indexOf("⚠"));
    expect(r.indexOf("⚠")).toBeLessThan(r.indexOf("ℹ"));
  });
  it("detects untagged images but accepts digests", () => {
    const mk = (img: string) => `apiVersion: v1\nkind: Pod\nmetadata: { name: p }\nspec:\n  containers:\n    - name: c\n      image: ${img}\n`;
    expect(runK8sLint(mk("nginx"), o).output).toContain("no tag");
    expect(runK8sLint(mk("localhost:5000/app"), o).output).toContain("no tag");
    expect(runK8sLint(mk("nginx@sha256:" + "a".repeat(64)), o).output).not.toContain("KL012");
  });
  it("reports deprecated APIs and handles multi-document files", () => {
    const r = runK8sLint("apiVersion: extensions/v1beta1\nkind: Ingress\nmetadata: { name: i }\nspec: {}\n---\napiVersion: v1\nkind: Service\nmetadata: { name: s }\nspec: { type: LoadBalancer }\n", o).output;
    expect(r).toContain("2 resources");
    expect(r).toContain("KL002 Ingress/i: apiVersion extensions/v1beta1 removed in Kubernetes 1.22");
    expect(r).toContain("KL030 Service/s");
    expect(r).toContain("KL031");
  });
  it("lints RBAC and Secrets, and respects the check toggles", () => {
    const rbac = "apiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRole\nmetadata: { name: r }\nrules:\n  - { apiGroups: ['*'], resources: ['*'], verbs: ['*'] }\n";
    expect(runK8sLint(rbac, o).output).toContain("KL036");
    expect(runK8sLint(rbac, { ...o, securityChecks: false }).output).not.toContain("KL036");
    const noRel = good.replace("replicas: 3", "replicas: 1");
    expect(runK8sLint(noRel, { ...o, reliabilityChecks: false }).output).not.toContain("KL020");
  });
  it("filters by severity and reports YAML errors", () => {
    const only = runK8sLint("apiVersion: v1\nkind: Pod\nmetadata: { name: p }\nspec:\n  containers:\n    - name: c\n      image: nginx:latest\n", { ...o, minSeverity: "error" }).output;
    expect(only).toContain("Nothing to report");
    expect(runK8sLint("a: [", o).error?.message).toMatch(/YAML error/);
    expect(runK8sLint("", o)).toEqual({ output: "", error: null });
  });
});
