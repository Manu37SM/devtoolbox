import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const haproxyConfigGeneratorTool: ToolRegistryEntry = {
  slug: "haproxy-config-generator",
  name: "HAProxy Config Generator",
  module: "generators",
  description: "Generate haproxy.cfg for HTTP or TCP load balancing with TLS termination, health checks, balancing algorithm, sticky sessions, rate limiting, redirects and a stats page.",
  aliases: ["haproxy.cfg", "haproxy load balancer", "haproxy backend", "haproxy ssl", "haproxy health check", "haproxy sticky"],
  icon: "Network",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["haproxy config generator", "haproxy.cfg", "haproxy load balancer", "haproxy backend", "haproxy ssl", "haproxy health check", "haproxy sticky"] },
};
