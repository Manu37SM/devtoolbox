import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { KongConfigGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;
const KNOWN = ["rate-limiting", "key-auth", "jwt", "basic-auth", "cors", "ip-restriction", "correlation-id", "prometheus", "request-size-limiting", "acl", "bot-detection", "request-termination"] as const;

const list = (s?: string) => (s ?? "").split(/[,\s]+/).filter(Boolean);

function rate(s?: string): Obj | string {
  const m = /^(\d+)\s*\/\s*(second|minute|hour|day)$/i.exec((s ?? "60/minute").trim());
  if (!m) return `rate must look like 100/minute (got "${s}")`;
  return { [m[2]!.toLowerCase()]: Number(m[1]), policy: "local" };
}

export function pluginConfig(name: string, f: Record<string, string>): Obj | string {
  switch (name) {
    case "rate-limiting": return rate(f.rate);
    case "key-auth": return { key_names: ["apikey"] };
    case "jwt": return {};
    case "basic-auth": return {};
    case "cors": return { origins: list(f.origins).length ? list(f.origins) : ["*"] };
    case "ip-restriction": {
      const allow = list(f.allow), deny = list(f.deny);
      if (!allow.length && !deny.length) return "ip-restriction needs an allow: or deny: line";
      return { ...(allow.length ? { allow } : {}), ...(deny.length ? { deny } : {}) };
    }
    case "correlation-id": return { header_name: "X-Request-ID", generator: "uuid", echo_downstream: true };
    case "prometheus": return {};
    case "request-size-limiting": return { allowed_payload_size: Number(f.maxsize ?? 10), size_unit: "megabytes" };
    case "acl": {
      const allow = list(f.groups);
      if (!allow.length) return "acl needs a groups: line";
      return { allow };
    }
    case "bot-detection": return {};
    case "request-termination": return { status_code: Number(f.status ?? 503), message: f.message ?? "Service unavailable" };
    default: return `Unknown plugin "${name}". Supported: ${KNOWN.join(", ")}`;
  }
}

export function parseBlock(text: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of text.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

export function generateKong(input: string, o: KongConfigGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const blocks = input.split(/^\s*---\s*$/m).filter((b) => b.trim());
  const services: Obj[] = [];
  const curls: string[] = [];
  for (const [bi, b] of blocks.entries()) {
    const f = parseBlock(b);
    const fail = (message: string): TransformResult => ({ output: "", error: { message: `Service ${bi + 1}: ${message}` } });
    if (!f.service) return fail("missing service: name");
    if (!/^[A-Za-z0-9._~-]+$/.test(f.service)) return fail("service name may only use letters, digits, . _ ~ -");
    if (!f.url) return fail("missing url:");
    if (!/^https?:\/\/[^\s/]+(:\d+)?(\/\S*)?$/.test(f.url)) return fail(`url "${f.url}" must be http(s)://host[:port][/path]`);
    const paths = list(f.route ?? f.routes ?? "/");
    if (paths.some((p) => !p.startsWith("/") && !p.startsWith("~"))) return fail("route paths must start with /");
    const methods = list(f.methods).map((m) => m.toUpperCase());
    const route: Obj = { name: `${f.service}-route`, paths, ...(methods.length ? { methods } : {}), strip_path: !/^(false|no)$/i.test(f.strip_path ?? "true") };
    const plugins: Obj[] = [];
    for (const p of list(f.plugins)) {
      const cfg = pluginConfig(p, f);
      if (typeof cfg === "string") return fail(cfg);
      plugins.push({ name: p, ...(Object.keys(cfg).length ? { config: cfg } : {}) });
    }
    services.push({ name: f.service, url: f.url, routes: [route], ...(plugins.length ? { plugins } : {}) });

    const c: string[] = [`curl -sS -X POST http://localhost:8001/services -d name=${f.service} -d url=${f.url}`];
    c.push(`curl -sS -X POST http://localhost:8001/services/${f.service}/routes -d name=${f.service}-route ${paths.map((p) => `-d 'paths[]=${p}'`).join(" ")}${methods.map((m) => ` -d 'methods[]=${m}'`).join("")} -d strip_path=${route.strip_path}`);
    for (const p of plugins) {
      const cfg = (p.config ?? {}) as Obj;
      const args = Object.entries(cfg).map(([k, v]) => Array.isArray(v) ? v.map((x) => `-d 'config.${k}[]=${x}'`).join(" ") : `-d config.${k}=${v}`).join(" ");
      c.push(`curl -sS -X POST http://localhost:8001/services/${f.service}/plugins -d name=${p.name}${args ? " " + args : ""}`);
    }
    curls.push(c.join("\n"));
  }
  if (o.format === "admin-api") return { output: curls.join("\n\n") + "\n", error: null };
  return { output: dump({ _format_version: "3.0", services }, { lineWidth: -1, noRefs: true }), error: null };
}
