/* eslint-disable @typescript-eslint/no-explicit-any -- parsed YAML/AST shapes are asserted structurally in tests */
import { describe, expect, it } from "vitest";
import { loadAll } from "js-yaml";
import { runKubernetesManifestGenerator } from "./transform";
import type { KubernetesManifestGeneratorOptions } from "./schema";

const all: KubernetesManifestGeneratorOptions = { springBoot: true, service: true, ingress: true, hpa: true, pdb: true };
const parse = (out: string) => loadAll(out) as Record<string, any>[];

describe("runKubernetesManifestGenerator", () => {
  const INPUT = "name: Orders API\nimage: ghcr.io/acme/orders:2.3.1\nnamespace: shop\nhost: orders.acme.com\nenv: SPRING_PROFILES_ACTIVE=prod; TZ=Asia/Kolkata\nsecret-env: DB_PASSWORD\nreplicas: 3";
  it("generates hardened workloads with Spring Boot probes", () => {
    const docs = parse(runKubernetesManifestGenerator(INPUT, all).output);
    expect(docs.map((d) => d.kind)).toEqual(["Deployment", "Service", "Ingress", "HorizontalPodAutoscaler", "PodDisruptionBudget"]);
    const dep = docs[0]!;
    expect(dep.metadata).toMatchObject({ name: "orders-api", namespace: "shop" });
    const c = dep.spec.template.spec.containers[0];
    expect(c.securityContext).toEqual({ runAsNonRoot: true, allowPrivilegeEscalation: false, readOnlyRootFilesystem: true, capabilities: { drop: ["ALL"] } });
    expect(c.livenessProbe.httpGet.path).toBe("/actuator/health/liveness");
    expect(c.startupProbe.failureThreshold).toBe(30);
    expect(c.env).toContainEqual({ name: "DB_PASSWORD", valueFrom: { secretKeyRef: { name: "orders-api-secrets", key: "DB_PASSWORD" } } });
    expect(c.env).toContainEqual({ name: "TZ", value: "Asia/Kolkata" });
    expect(c.resources.limits.cpu).toBeUndefined();
    expect(dep.spec.template.spec.securityContext.seccompProfile.type).toBe("RuntimeDefault");
    expect(docs[2]!.spec.rules[0].host).toBe("orders.acme.com");
    expect(docs[3]!.spec).toMatchObject({ minReplicas: 3, maxReplicas: 9 });
  });
  it("supports a generic app without optional objects", () => {
    const out = runKubernetesManifestGenerator("name: web\nimage: nginx:latest\nhealth-path: /ready\nreplicas: 1", { springBoot: false, service: true, ingress: false, hpa: false, pdb: true }).output;
    expect(out).toContain("# Image nginx:latest has no fixed tag");
    expect(out).toContain("# A PodDisruptionBudget with one replica blocks node drains");
    const docs = parse(out);
    expect(docs.map((d) => d.kind)).toEqual(["Deployment", "Service", "PodDisruptionBudget"]);
    expect(docs[0]!.spec.template.spec.containers[0].readinessProbe.httpGet.path).toBe("/ready");
    expect(docs[0]!.spec.template.spec.containers[0].startupProbe).toBeUndefined();
  });
});
