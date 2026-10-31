import type { TransformResult } from "@/lib/tool-transform";
import type { HaproxyConfigGeneratorOptions } from "./schema";

const TIME = /^\d+(us|ms|s|m|h|d)?$/;
const HOSTNAME = /^(\*\.)?([A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)*$/;
const SERVER = /^(\[[0-9A-Fa-f:.]+\]|[A-Za-z0-9_.-]+):(\d{1,5})$/;
const sanitize = (s: string) => s.replace(/^\*\./, "wild_").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "x";

interface Route { key: string; listen: string; servers: string[]; line: number }

export function haproxyConfigGenerator(input: string, options: Partial<HaproxyConfigGeneratorOptions>): TransformResult {
  const o: HaproxyConfigGeneratorOptions = {
    mode: options.mode ?? "http", balance: options.balance ?? "roundrobin", healthPath: options.healthPath ?? "/", tls: options.tls ?? false,
    certPath: options.certPath ?? "/etc/haproxy/certs/site.pem", redirectHttps: options.redirectHttps ?? true, http2: options.http2 ?? true, hsts: options.hsts ?? false,
    sticky: options.sticky ?? false, forwardHeaders: options.forwardHeaders ?? true, rateLimit: options.rateLimit ?? 0, maxconn: options.maxconn ?? 4096,
    timeoutClient: options.timeoutClient ?? "30s", timeoutServer: options.timeoutServer ?? "30s", timeoutConnect: options.timeoutConnect ?? "5s",
    stats: options.stats ?? false, statsPort: options.statsPort ?? 8404, statsAuth: options.statsAuth ?? "",
  };
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return { output: "", error: null };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  for (const [k, v] of [["client", o.timeoutClient], ["server", o.timeoutServer], ["connect", o.timeoutConnect]] as const)
    if (!TIME.test(v)) return fail(`Timeout ${k} "${v}" must look like 5s, 500ms or 2m.`);
  if (o.tls && !/^\/[^\s"']+$/.test(o.certPath)) return fail("Certificate path must be absolute and contain no spaces or quotes.");
  if (o.healthPath && !/^\/\S*$/.test(o.healthPath)) return fail("Health-check path must start with / and contain no spaces.");
  if (o.statsAuth && !/^[^:\s]+:[^\s]+$/.test(o.statsAuth)) return fail('Stats credentials must be "user:password" without spaces.');

  const routes: Route[] = [];
  for (const [i, line] of lines.entries()) {
    const m = /^(.+?)\s*->\s*(.+)$/.exec(line);
    if (!m) return fail(`Line ${i + 1}: expected "${o.mode === "http" ? "host" : ":port"} -> server:port, server:port" — got "${line}".`);
    const listen = m[1]!.trim();
    const servers = m[2]!.split(",").map((s) => s.trim()).filter(Boolean);
    if (o.mode === "http" && !HOSTNAME.test(listen) && listen !== "*") return fail(`Line ${i + 1}: "${listen}" is not a valid host name (use * for the default backend).`);
    if (o.mode === "tcp" && !/^(\d{1,3}(\.\d{1,3}){3})?:\d{1,5}$/.test(listen)) return fail(`Line ${i + 1}: "${listen}" must be ":port" or "ip:port" in TCP mode.`);
    if (o.mode === "tcp") {
      const port = Number(listen.split(":")[1]);
      if (port < 1 || port > 65535) return fail(`Line ${i + 1}: port ${port} is out of range.`);
    }
    if (servers.length === 0) return fail(`Line ${i + 1}: no servers given.`);
    for (const s of servers) {
      const sm = SERVER.exec(s);
      if (!sm) return fail(`Line ${i + 1}: server "${s}" must be host:port.`);
      const port = Number(sm[2]);
      if (port < 1 || port > 65535) return fail(`Line ${i + 1}: server port ${port} is out of range.`);
    }
    routes.push({ key: o.mode === "tcp" ? `tcp_${listen.replace(/^:/, "").replace(/[^0-9]+/g, "_")}` : sanitize(listen), listen, servers, line: i + 1 });
  }
  const keys = new Set<string>();
  for (const r of routes) {
    if (keys.has(r.key)) return fail(`Line ${r.line}: "${r.listen}" collides with another entry after name sanitising (backend "${r.key}").`);
    keys.add(r.key);
  }

  const L: string[] = [];
  const ind = (s: string) => L.push(`    ${s}`);
  L.push("global");
  ind("log /dev/log local0");
  ind(`maxconn ${o.maxconn}`);
  if (o.tls) ind("ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets");
  L.push("", "defaults");
  ind("log global");
  ind(`mode ${o.mode}`);
  ind(o.mode === "http" ? "option httplog" : "option tcplog");
  ind("option dontlognull");
  ind("retries 3");
  ind(`timeout connect ${o.timeoutConnect}`);
  ind(`timeout client ${o.timeoutClient}`);
  ind(`timeout server ${o.timeoutServer}`);
  if (o.mode === "http") ind("option forwardfor");

  const backend = (r: Route) => {
    L.push("", `backend be_${r.key}`);
    ind(`balance ${o.balance}`);
    if (o.mode === "http" && o.healthPath) {
      ind("option httpchk");
      ind(`http-check send meth GET uri ${o.healthPath}`);
    }
    if (o.sticky && o.mode === "http") ind("cookie SRV insert indirect nocache httponly");
    r.servers.forEach((s, n) => ind(`server s${n + 1} ${s} check${o.sticky && o.mode === "http" ? ` cookie s${n + 1}` : ""}`));
  };

  if (o.mode === "http") {
    const listenHttps = o.tls;
    L.push("", "frontend fe_http");
    ind("bind *:80");
    if (listenHttps && o.redirectHttps) ind("http-request redirect scheme https code 301 unless { ssl_fc }");
    const frontendBody = () => {
      if (o.forwardHeaders) {
        ind(`http-request set-header X-Forwarded-Proto ${listenHttps ? "https" : "http"}`);
      }
      if (o.rateLimit > 0) {
        ind("stick-table type ip size 100k expire 30s store http_req_rate(10s)");
        ind("http-request track-sc0 src");
        ind(`http-request deny deny_status 429 if { sc_http_req_rate(0) gt ${o.rateLimit} }`);
      }
      if (o.hsts && listenHttps) ind('http-response set-header Strict-Transport-Security "max-age=31536000; includeSubDomains"');
      const named = routes.filter((r) => r.listen !== "*");
      for (const r of named) {
        // hdr(host) may carry a port; field(1,:) strips it. Wildcards match by suffix.
        if (r.listen.startsWith("*.")) ind(`acl host_${r.key} hdr(host),field(1,:) -i -m end ${r.listen.slice(1)}`);
        else ind(`acl host_${r.key} hdr(host),field(1,:) -i ${r.listen}`);
      }
      for (const r of named) ind(`use_backend be_${r.key} if host_${r.key}`);
      const def = routes.find((r) => r.listen === "*") ?? routes[0]!;
      ind(`default_backend be_${def.key}`);
    };
    if (!(listenHttps && o.redirectHttps)) frontendBody();
    else ind(`default_backend be_${(routes.find((r) => r.listen === "*") ?? routes[0]!).key}`);
    if (listenHttps) {
      L.push("", "frontend fe_https");
      ind(`bind *:443 ssl crt ${o.certPath}${o.http2 ? " alpn h2,http/1.1" : ""}`);
      frontendBody();
    }
  } else {
    for (const r of routes) {
      L.push("", `frontend fe_${r.key}`);
      ind(`bind ${r.listen.startsWith(":") ? "*" + r.listen : r.listen}`);
      ind(`default_backend be_${r.key}`);
    }
  }
  routes.forEach(backend);

  if (o.stats) {
    L.push("", "frontend stats");
    ind(`bind ${o.statsAuth ? "*" : "127.0.0.1"}:${o.statsPort}`);
    ind("mode http");
    ind("stats enable");
    ind("stats uri /stats");
    ind("stats refresh 10s");
    if (o.statsAuth) ind(`stats auth ${o.statsAuth}`);
  }
  return { output: L.join("\n") + "\n", error: null };
}
