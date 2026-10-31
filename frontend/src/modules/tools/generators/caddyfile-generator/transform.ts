import type { TransformResult } from "@/lib/tool-transform";
import type { CaddyfileGeneratorOptions } from "./schema";

type Kind = { type: "proxy"; upstreams: string[] } | { type: "static"; root: string } | { type: "redirect"; to: string; code: string } | { type: "respond"; text: string };
interface Site {
  host: string;
  kind: Kind;
  line: number;
}

const HOST = /^(?:https?:\/\/)?(?:\*\.)?(?:localhost|[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*)(?::\d{1,5})?$/;
const UPSTREAM = /^(?:https?:\/\/)?(?:\[[0-9a-fA-F:]+\]|[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?)(?::\d{1,5})?$/;
const PATH = /^[\w./~@+-]+$/;

export function parseSites(input: string): Site[] {
  const sites: Site[] = [];
  input.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const text = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!text) return;
    const m = /^(\S+)\s*(->|=>|redirect|respond)\s*(.+)$/i.exec(text);
    if (!m) throw new Error(`Line ${line}: write "host -> upstream", "host => /path/to/files", "host redirect URL" or "host respond text".`);
    const host = m[1]!;
    if (!HOST.test(host)) throw new Error(`Line ${line}: "${host}" is not a valid site address.`);
    const op = m[2]!.toLowerCase();
    const rest = m[3]!.trim();
    if (op === "->") {
      const ups = rest.split(/[,\s]+/).filter(Boolean);
      for (const u of ups) if (!UPSTREAM.test(u)) throw new Error(`Line ${line}: "${u}" is not a valid upstream (host:port).`);
      sites.push({ host, kind: { type: "proxy", upstreams: ups }, line });
    } else if (op === "=>") {
      if (!PATH.test(rest)) throw new Error(`Line ${line}: "${rest}" is not a usable folder path (letters, digits and ./_-~@+ only).`);
      sites.push({ host, kind: { type: "static", root: rest }, line });
    } else if (op === "redirect") {
      const rm = /^(?:(30[1278])\s+)?(\S+)$/.exec(rest);
      if (!rm || !/^https?:\/\/[^\s{}"']+$/.test(rm[2]!.replace(/\{(uri|host|path|query)\}/g, ""))) throw new Error(`Line ${line}: redirect needs a full URL such as https://example.com{uri}.`);
      sites.push({ host, kind: { type: "redirect", to: rm[2]!, code: rm[1] ?? "301" }, line });
    } else {
      const t = rest.replace(/[^\w .,:!?/-]/g, "").trim();
      sites.push({ host, kind: { type: "respond", text: t || "OK" }, line });
    }
  });
  if (!sites.length) throw new Error("Add at least one site, for example: example.com -> localhost:3000");
  return sites;
}

const baseHost = (h: string) => h.replace(/^https?:\/\//, "");

export function caddyfileGenerator(input: string, options: Partial<CaddyfileGeneratorOptions>): TransformResult {
  const o: CaddyfileGeneratorOptions = {
    email: options.email ?? "", encode: options.encode ?? "both", securityHeaders: options.securityHeaders ?? true, hsts: options.hsts ?? false, spa: options.spa ?? false,
    fileBrowse: options.fileBrowse ?? false, lbPolicy: options.lbPolicy ?? "round_robin", healthPath: options.healthPath ?? "", wwwRedirect: options.wwwRedirect ?? "none",
    log: options.log ?? "none", tlsInternal: options.tlsInternal ?? false, maxBody: options.maxBody ?? "", adminOff: options.adminOff ?? false, http3: options.http3 ?? true,
  };
  if (!input.trim()) return { output: "", error: null };
  if (o.email && !/^[^\s@{}"']+@[^\s@{}"']+\.[^\s@{}"']+$/.test(o.email)) return { output: "", error: { message: "The ACME e-mail address does not look valid." } };
  if (o.maxBody && !/^\d+(?:KB|MB|GB|B)?$/i.test(o.maxBody)) return { output: "", error: { message: 'Maximum body must look like 10MB, 512KB or 1GB.' } };
  if (o.healthPath && !/^\/[\w./~@+-]*$/.test(o.healthPath)) return { output: "", error: { message: "The health check path must start with / and contain only path characters." } };
  let sites: Site[];
  try {
    sites = parseSites(input);
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }

  const out: string[] = [];
  const global: string[] = [];
  if (o.email) global.push(`email ${o.email}`);
  if (o.adminOff) global.push("admin off");
  if (!o.http3) global.push("servers {\n\t\tprotocols h1 h2\n\t}");
  if (global.length) out.push(`{\n${global.map((g) => `\t${g}`).join("\n")}\n}`, "");

  const indent = (lines: string[], n = 1) => lines.flatMap((l) => l.split("\n")).map((l) => (l ? "\t".repeat(n) + l : l)).join("\n");

  for (const s of sites) {
    const h = baseHost(s.host);
    const isLocal = /^(localhost|127\.|\[::1\])/.test(h) || h.endsWith(".localhost");
    const body: string[] = [];
    if (o.tlsInternal || isLocal) { if (!/^http:\/\//.test(s.host)) body.push("tls internal"); }
    if (o.maxBody && s.kind.type === "proxy") body.push("request_body {", `\tmax_size ${o.maxBody}`, "}");
    if (o.encode !== "none" && s.kind.type !== "redirect") body.push(`encode ${o.encode === "both" ? "zstd gzip" : o.encode}`);
    if (o.securityHeaders && s.kind.type !== "redirect") {
      body.push("header {", "\tX-Content-Type-Options nosniff", "\tX-Frame-Options SAMEORIGIN", "\tReferrer-Policy strict-origin-when-cross-origin", "\t-Server");
      if (o.hsts) body.push('\tStrict-Transport-Security "max-age=31536000; includeSubDomains"');
      body.push("}");
    } else if (o.hsts && s.kind.type !== "redirect") body.push("header Strict-Transport-Security \"max-age=31536000; includeSubDomains\"");
    if (o.log === "stdout") body.push("log {", "\toutput stdout", "}");
    if (o.log === "file") body.push("log {", `\toutput file /var/log/caddy/${h.replace(/[^\w.-]/g, "_")}.log {`, "\t\troll_size 10mb", "\t\troll_keep 5", "\t}", "}");

    const k = s.kind;
    if (k.type === "proxy") {
      const multi = k.upstreams.length > 1;
      const opts: string[] = [];
      if (multi) opts.push(`lb_policy ${o.lbPolicy}`);
      if (o.healthPath) opts.push(`health_uri ${o.healthPath}`, "health_interval 10s");
      body.push(`reverse_proxy ${k.upstreams.join(" ")}${opts.length ? ` {\n${opts.map((x) => `\t${x}`).join("\n")}\n}` : ""}`);
    } else if (k.type === "static") {
      body.push(`root * ${k.root}`);
      if (o.spa) body.push("try_files {path} /index.html");
      body.push(o.fileBrowse ? "file_server browse" : "file_server");
    } else if (k.type === "redirect") {
      body.push(`redir ${k.to} ${k.code}`);
    } else {
      body.push(`respond "${k.text}" 200`);
    }
    const plain = !/^https?:\/\//.test(s.host) && !s.host.includes(":") && !s.host.startsWith("*") && !s.host.startsWith("www.") && !isLocal && !/^\d+\.\d+\.\d+\.\d+$/.test(h) && h.includes(".");
    const canonical = plain && o.wwwRedirect === "to-www" ? `www.${s.host}` : s.host;
    out.push(`${canonical} {`, indent(body), "}", "");
    if (plain && o.wwwRedirect !== "none") {
      const [from, to] = o.wwwRedirect === "to-apex" ? [`www.${s.host}`, s.host] : [s.host, `www.${s.host}`];
      out.push(`${from} {`, `\tredir https://${to}{uri} permanent`, "}", "");
    }
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  return { output: out.join("\n") + "\n", error: null };
}
