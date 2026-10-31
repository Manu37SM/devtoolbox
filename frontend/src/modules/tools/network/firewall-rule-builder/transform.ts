import type { TransformResult } from "@/lib/tool-transform";
import type { FirewallRuleBuilderOptions } from "./schema";

type Action = "allow" | "deny" | "reject" | "limit";
type Proto = "tcp" | "udp" | "icmp" | "any";
type Fam = "4" | "6";

export interface Rule {
  action: Action;
  dir: "in" | "out";
  proto: Proto;
  ports: string[];
  src?: string;
  dst?: string;
  iface?: string;
  comment?: string;
  /** Source line (1-based) for error messages */
  line: number;
}

/** Named services → [protocol, ports] */
export const SERVICES: Record<string, [Proto, string[]]> = {
  ssh: ["tcp", ["22"]], http: ["tcp", ["80"]], https: ["tcp", ["443"]], web: ["tcp", ["80", "443"]], dns: ["any", ["53"]], smtp: ["tcp", ["25"]], smtps: ["tcp", ["465"]],
  submission: ["tcp", ["587"]], imap: ["tcp", ["143"]], imaps: ["tcp", ["993"]], pop3: ["tcp", ["110"]], pop3s: ["tcp", ["995"]], ftp: ["tcp", ["21"]], telnet: ["tcp", ["23"]],
  mysql: ["tcp", ["3306"]], postgres: ["tcp", ["5432"]], postgresql: ["tcp", ["5432"]], redis: ["tcp", ["6379"]], mongodb: ["tcp", ["27017"]], ntp: ["udp", ["123"]],
  rdp: ["tcp", ["3389"]], ldap: ["tcp", ["389"]], ldaps: ["tcp", ["636"]], smb: ["tcp", ["445"]], snmp: ["udp", ["161"]], syslog: ["udp", ["514"]],
  wireguard: ["udp", ["51820"]], "http-alt": ["tcp", ["8080"]], kubernetes: ["tcp", ["6443"]], elasticsearch: ["tcp", ["9200"]], rabbitmq: ["tcp", ["5672"]], kafka: ["tcp", ["9092"]],
};

const IFACE = /^[A-Za-z0-9_.:@+-]{1,15}$/;

function validCidr(s: string): Fam | null {
  const m4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/.exec(s);
  if (m4) return m4.slice(1, 5).every((x) => Number(x) <= 255) && (m4[5] === undefined || Number(m4[5]) <= 32) ? "4" : null;
  const m6 = /^([0-9a-fA-F:.]+)(?:\/(\d{1,3}))?$/.exec(s);
  if (m6 && s.includes(":") && !/:::/.test(s) && (m6[1]!.match(/::/g) ?? []).length <= 1 && (m6[2] === undefined || Number(m6[2]) <= 128)) {
    const groups = m6[1]!.split(":");
    if (groups.length <= 8 + 2 && groups.every((g) => g === "" || /^[0-9a-fA-F]{1,4}$/.test(g) || /^\d+\.\d+\.\d+\.\d+$/.test(g))) return "6";
  }
  return null;
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  for (const m of line.matchAll(re)) out.push(m[1] ?? m[2] ?? m[3]!);
  return out;
}

function parsePorts(spec: string, line: number): string[] {
  const out: string[] = [];
  for (const part of spec.split(",")) {
    const m = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(part);
    if (!m) throw new Error(`Line ${line}: "${part}" is not a port or port range.`);
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > 65535 || a > b) throw new Error(`Line ${line}: port ${part} must be between 1 and 65535 (and a range must go up).`);
    out.push(a === b ? String(a) : `${a}-${b}`);
  }
  return out;
}

export function parseRules(input: string): Rule[] {
  const rules: Rule[] = [];
  input.split(/\r?\n/).forEach((raw, idx) => {
    const line = idx + 1;
    const text = raw.replace(/(^|\s)#.*$/, "").trim();
    if (!text) return;
    const t = tokenize(text);
    const verb = t.shift()!.toLowerCase();
    if (!["allow", "deny", "reject", "limit"].includes(verb)) throw new Error(`Line ${line}: start with allow, deny, reject or limit (got "${verb}").`);
    const rule: Rule = { action: verb as Action, dir: "in", proto: "any", ports: [], line };
    let protoSet = false;
    while (t.length) {
      const w = t.shift()!;
      const lw = w.toLowerCase();
      if (lw === "in" || lw === "out") rule.dir = lw;
      else if (["tcp", "udp", "icmp", "any"].includes(lw)) { rule.proto = lw as Proto; protoSet = true; }
      else if (/^[\d,-]+$/.test(w)) rule.ports = parsePorts(w, line);
      else if (SERVICES[lw]) {
        const [p, ports] = SERVICES[lw]!;
        rule.ports = [...ports];
        if (!protoSet) { rule.proto = p; protoSet = true; }
      } else if (lw === "from" || lw === "to") {
        const v = t.shift();
        if (!v) throw new Error(`Line ${line}: "${lw}" needs an address.`);
        if (v.toLowerCase() !== "any") {
          if (!validCidr(v)) throw new Error(`Line ${line}: "${v}" is not an IPv4/IPv6 address or CIDR.`);
          if (lw === "from") rule.src = v; else rule.dst = v;
        }
      } else if (lw === "on") {
        const v = t.shift();
        if (!v || !IFACE.test(v)) throw new Error(`Line ${line}: "${v ?? ""}" is not a valid interface name.`);
        rule.iface = v;
      } else if (lw === "comment") {
        const v = t.join(" ");
        t.length = 0;
        rule.comment = v.replace(/[^\w .,:/@()#+=-]/g, "").trim().slice(0, 60) || undefined;
      } else throw new Error(`Line ${line}: don't understand "${w}". Example: allow tcp 22 from 10.0.0.0/8 comment ssh`);
    }
    if (rule.ports.length && rule.proto === "icmp") throw new Error(`Line ${line}: ICMP has no ports.`);
    const famSrc = rule.src ? validCidr(rule.src) : null, famDst = rule.dst ? validCidr(rule.dst) : null;
    if (famSrc && famDst && famSrc !== famDst) throw new Error(`Line ${line}: source and destination must both be IPv4 or both IPv6.`);
    if (rule.ports.length && rule.proto === "any" && !protoSet) rule.proto = "tcp"; // "allow 8080" means TCP
    rules.push(rule);
  });
  return rules;
}

const famOf = (r: Rule): Fam | null => validCidr(r.src ?? r.dst ?? "") ;
const verbLabel = (a: Action) => (a === "allow" ? "accept" : a === "limit" ? "accept" : a === "deny" ? "drop" : "reject");

function warnings(rules: Rule[], o: FirewallRuleBuilderOptions): string[] {
  const w: string[] = [];
  const opensSsh = rules.some((r) => r.dir === "in" && (r.action === "allow" || r.action === "limit") && (r.proto === "tcp" || r.proto === "any") && (r.ports.length === 0 || r.ports.some((p) => { const [a, b] = p.split("-").map(Number); return o.sshPort >= a! && o.sshPort <= (b ?? a!); })));
  if (o.defaultIn !== "accept" && !opensSsh) w.push(`WARNING: incoming traffic is denied by default and no rule allows SSH (tcp ${o.sshPort}). Applying this over SSH will lock you out. Add: allow tcp ${o.sshPort} from <your-ip>`);
  if (rules.some((r) => r.action === "allow" && r.dir === "in" && !r.ports.length && r.proto === "any" && !r.src && !r.dst && !r.iface)) w.push("WARNING: a rule allows ALL incoming traffic from anywhere.");
  if (o.defaultOut === "drop") w.push("NOTE: outgoing traffic is denied by default. DNS (53), NTP (123) and package mirrors need explicit 'allow out' rules.");
  return w;
}

/* ------------------------------ ufw ------------------------------ */

function ufwCommands(rules: Rule[], o: FirewallRuleBuilderOptions): string[] {
  const out: string[] = [];
  if (o.flush) out.push("ufw --force reset");
  out.push(`ufw default ${o.defaultIn === "accept" ? "allow" : o.defaultIn === "reject" ? "reject" : "deny"} incoming`, `ufw default ${o.defaultOut === "accept" ? "allow" : "deny"} outgoing`);
  if (o.logDropped) out.push("ufw logging low");
  if (o.allowPing) out.push("# ufw already answers ping through /etc/ufw/before.rules (ufw-before-input echo-request ACCEPT)");
  for (const r of rules) {
    if (r.proto === "icmp") { out.push(`# line ${r.line}: ufw cannot express ICMP rules on the command line; edit /etc/ufw/before.rules instead`); continue; }
    const verb = r.action === "allow" ? "allow" : r.action === "deny" ? "deny" : r.action === "reject" ? "reject" : "limit";
    const protos = r.ports.length && r.proto === "any" ? ["tcp", "udp"] : [r.proto === "any" ? "" : r.proto];
    for (const p of protos) {
      const parts = ["ufw", verb, r.dir];
      if (r.iface) parts.push("on", r.iface);
      if (p) parts.push("proto", p);
      if (r.src || r.dst || r.ports.length) {
        parts.push("from", r.src ?? "any", "to", r.dst ?? "any");
        if (r.ports.length) parts.push("port", r.ports.map((x) => x.replace("-", ":")).join(","));
      }
      if (r.comment && o.comments) parts.push("comment", `'${r.comment}'`);
      out.push(parts.join(" "));
    }
  }
  out.push("ufw --force enable");
  return out;
}

/* ---------------------------- iptables --------------------------- */

const ipPorts = (p: string[]) => p.map((x) => x.replace("-", ":"));

function iptRule(r: Rule, fam: Fam, o: FirewallRuleBuilderOptions): string[] {
  const chain = r.dir === "in" ? "INPUT" : "OUTPUT";
  const protos: (string | null)[] = r.proto === "any" ? (r.ports.length ? ["tcp", "udp"] : [null]) : r.proto === "icmp" ? [fam === "6" ? "ipv6-icmp" : "icmp"] : [r.proto];
  return protos.map((p) => {
    const a = ["-A", chain];
    if (r.iface) a.push(r.dir === "in" ? "-i" : "-o", r.iface);
    if (p) a.push("-p", p);
    if (r.src) a.push("-s", r.src);
    if (r.dst) a.push("-d", r.dst);
    if (r.ports.length === 1) a.push("--dport", ipPorts(r.ports)[0]!);
    else if (r.ports.length > 1) a.push("-m", "multiport", "--dports", ipPorts(r.ports).join(","));
    if (r.comment && o.comments) a.push("-m", "comment", "--comment", `"${r.comment}"`);
    if (r.action === "limit") a.push("-m", "conntrack", "--ctstate", "NEW", "-m", "limit", "--limit", "6/minute", "--limit-burst", "6", "-j", "ACCEPT");
    else a.push("-j", r.action === "allow" ? "ACCEPT" : r.action === "deny" ? "DROP" : "REJECT");
    return a.join(" ");
  });
}

function iptFamily(rules: Rule[], fam: Fam, o: FirewallRuleBuilderOptions): { policies: string[]; lines: string[] } {
  const lines: string[] = [];
  if (o.allowLoopback) lines.push("-A INPUT -i lo -j ACCEPT", "-A OUTPUT -o lo -j ACCEPT");
  if (o.dropInvalid) lines.push("-A INPUT -m conntrack --ctstate INVALID -j DROP");
  if (o.allowEstablished) lines.push("-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT", "-A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT");
  if (fam === "6" && o.defaultIn !== "accept") {
    for (const t of ["router-solicitation", "router-advertisement", "neighbour-solicitation", "neighbour-advertisement"]) lines.push(`-A INPUT -p ipv6-icmp --icmpv6-type ${t} -j ACCEPT`);
  }
  if (o.allowPing) lines.push(fam === "4" ? "-A INPUT -p icmp --icmp-type echo-request -j ACCEPT" : "-A INPUT -p ipv6-icmp --icmpv6-type echo-request -j ACCEPT");
  for (const r of rules) {
    const f = famOf(r);
    if (f && f !== fam) continue;
    lines.push(...iptRule(r, fam, o));
  }
  if (o.logDropped && o.defaultIn !== "accept") lines.push('-A INPUT -m limit --limit 5/minute --limit-burst 10 -j LOG --log-prefix "fw-dropped: " --log-level 4');
  if (o.defaultIn === "reject") lines.push("-A INPUT -j REJECT");
  const policies = [`:INPUT ${o.defaultIn === "accept" ? "ACCEPT" : "DROP"} [0:0]`, ":FORWARD DROP [0:0]", `:OUTPUT ${o.defaultOut === "accept" ? "ACCEPT" : "DROP"} [0:0]`];
  return { policies, lines };
}

function iptables(rules: Rule[], o: FirewallRuleBuilderOptions): string[] {
  const out: string[] = [];
  const fams: Fam[] = o.ipv6 || rules.some((r) => famOf(r) === "6") ? ["4", "6"] : ["4"];
  for (const fam of fams) {
    const bin = fam === "4" ? "iptables" : "ip6tables";
    const { policies, lines } = iptFamily(rules, fam, o);
    if (o.format === "file") {
      out.push(`# ${fam === "4" ? "IPv4 — apply with: iptables-restore < rules.v4" : "IPv6 — apply with: ip6tables-restore < rules.v6"}`, "*filter", ...policies, ...lines, "COMMIT", "");
    } else {
      if (o.flush) out.push(`${bin} -F`);
      for (const p of policies) { const m = /^:(\w+) (\w+)/.exec(p)!; out.push(`${bin} -P ${m[1]} ${m[2]}`); }
      for (const l of lines) out.push(`${bin} ${l}`);
      out.push("");
    }
  }
  if (o.format === "file") out.push("# Persist: Debian/Ubuntu → apt install iptables-persistent && netfilter-persistent save; RHEL → service iptables save");
  return out;
}

/* ----------------------------- nftables ---------------------------- */

function nftPortSet(p: string[]): string {
  return p.length === 1 ? p[0]! : `{ ${p.join(", ")} }`;
}

function nftRule(r: Rule, o: FirewallRuleBuilderOptions): string {
  const f = famOf(r);
  const a: string[] = [];
  if (r.iface) a.push(r.dir === "in" ? `iifname "${r.iface}"` : `oifname "${r.iface}"`);
  if (r.src) a.push(f === "6" ? `ip6 saddr ${r.src}` : `ip saddr ${r.src}`);
  if (r.dst) a.push(f === "6" ? `ip6 daddr ${r.dst}` : `ip daddr ${r.dst}`);
  if (r.proto === "icmp") a.push(f === "4" ? "meta l4proto icmp" : f === "6" ? "meta l4proto ipv6-icmp" : "meta l4proto { icmp, ipv6-icmp }");
  else if (r.proto === "any" && r.ports.length) a.push(`meta l4proto { tcp, udp } th dport ${nftPortSet(r.ports)}`);
  else if (r.proto !== "any") a.push(r.ports.length ? `${r.proto} dport ${nftPortSet(r.ports)}` : `meta l4proto ${r.proto}`);
  if (r.action === "limit") a.push("ct state new limit rate 6/minute");
  a.push(verbLabel(r.action));
  if (r.comment && o.comments) a.push(`comment "${r.comment}"`);
  return a.join(" ");
}

function nftables(rules: Rule[], o: FirewallRuleBuilderOptions): string[] {
  const input: string[] = [];
  const output: string[] = [];
  if (o.dropInvalid) input.push("ct state invalid drop");
  if (o.allowEstablished) { input.push("ct state { established, related } accept"); output.push("ct state { established, related } accept"); }
  if (o.allowLoopback) { input.push('iifname "lo" accept'); output.push('oifname "lo" accept'); }
  if (o.ipv6 && o.defaultIn !== "accept") input.push("icmpv6 type { nd-router-solicit, nd-router-advert, nd-neighbor-solicit, nd-neighbor-advert } accept");
  if (o.allowPing) input.push("icmp type echo-request accept", ...(o.ipv6 ? ["icmpv6 type echo-request accept"] : []));
  for (const r of rules) (r.dir === "in" ? input : output).push(nftRule(r, o));
  if (o.logDropped && o.defaultIn !== "accept") input.push('limit rate 5/minute burst 10 packets log prefix "fw-dropped: "');
  if (o.defaultIn === "reject") input.push("reject with icmpx type admin-prohibited");
  const body = [
    "table inet filter {",
    "  chain input {",
    `    type filter hook input priority filter; policy ${o.defaultIn === "accept" ? "accept" : "drop"};`,
    ...input.map((l) => `    ${l}`),
    "  }",
    "  chain forward {",
    "    type filter hook forward priority filter; policy drop;",
    "  }",
    "  chain output {",
    `    type filter hook output priority filter; policy ${o.defaultOut};`,
    ...output.map((l) => `    ${l}`),
    "  }",
    "}",
  ];
  if (o.format === "file") return ["#!/usr/sbin/nft -f", ...(o.flush ? ["", "# create-then-delete makes this safe to run when the table does not exist yet", "table inet filter", "delete table inet filter"] : []), "", ...body, "", "# Persist: write to /etc/nftables.conf and run: systemctl enable --now nftables"];
  // commands: load the whole ruleset in one atomic nft call
  return ["nft -f - <<'EOF'", ...(o.flush ? ["table inet filter", "delete table inet filter", ""] : []), ...body, "EOF"];
}

/* ---------------------------- firewalld ---------------------------- */

function firewalld(rules: Rule[], o: FirewallRuleBuilderOptions): string[] {
  const out: string[] = ["# Commands for the default zone; add --zone=NAME to target another zone"];
  const z = "firewall-cmd --permanent";
  out.push(`${z} --set-target=${o.defaultIn === "accept" ? "ACCEPT" : o.defaultIn === "reject" ? "%%REJECT%%" : "DROP"}`);
  if (o.flush) out.push("# Remove ports/rich rules you no longer want with --remove-port / --remove-rich-rule (list them with: firewall-cmd --list-all)");
  if (!o.allowPing) out.push(`${z} --add-icmp-block=echo-request`);
  else out.push(`${z} --remove-icmp-block=echo-request`);
  for (const r of rules) {
    if (r.dir === "out") { out.push(`# line ${r.line}: firewalld filters incoming traffic only; use "firewall-cmd --direct" or nftables for outgoing rules`); continue; }
    if (r.iface) out.push(`# line ${r.line}: firewalld ties interfaces to zones, so "on ${r.iface}" is ignored; use --zone=NAME --change-interface=${r.iface}`);
    const f = famOf(r);
    const protos = r.ports.length ? (r.proto === "any" ? ["tcp", "udp"] : [r.proto]) : r.proto === "any" ? [null] : [r.proto];
    if (!r.ports.length && r.proto === "any" && !r.src && !r.dst) {
      out.push(`# line ${r.line}: matching all traffic is a zone setting in firewalld; use --set-target instead of a rule`);
      continue;
    }
    const plain = !r.src && !r.dst && r.action === "allow" && !r.comment;
    for (const p of protos) {
      if (p === "icmp") {
        out.push(`${z} --add-rich-rule='rule${f ? ` family="ipv${f}"` : ""}${r.src ? ` source address="${r.src}"` : ""} protocol value="icmp" ${r.action === "allow" || r.action === "limit" ? "accept" : r.action === "reject" ? "reject" : "drop"}'`);
        continue;
      }
      for (const port of r.ports.length ? r.ports : [null]) {
        if (plain && port && p) { out.push(`${z} --add-port=${port}/${p}`); continue; }
        const el: string[] = [`rule${f ? ` family="ipv${f}"` : ""}`];
        if (r.src) el.push(`source address="${r.src}"`);
        if (r.dst) el.push(`destination address="${r.dst}"`);
        if (port && p) el.push(`port port="${port}" protocol="${p}"`);
        else if (p) el.push(`protocol value="${p}"`);
        if (o.logDropped && (r.action === "deny" || r.action === "reject")) el.push('log prefix="fw-dropped: " level="warning" limit value="5/m"');
        if (r.action === "limit") el.push('limit value="6/m"');
        el.push(r.action === "deny" ? "drop" : r.action === "reject" ? "reject" : "accept");
        out.push(`${z} --add-rich-rule='${el.join(" ")}'`);
      }
    }
  }
  out.push("firewall-cmd --reload");
  return out;
}

export function firewallRuleBuilder(input: string, options: Partial<FirewallRuleBuilderOptions>): TransformResult {
  const o: FirewallRuleBuilderOptions = {
    backend: options.backend ?? "ufw", defaultIn: options.defaultIn ?? "drop", defaultOut: options.defaultOut ?? "accept", allowLoopback: options.allowLoopback ?? true,
    allowEstablished: options.allowEstablished ?? true, dropInvalid: options.dropInvalid ?? true, allowPing: options.allowPing ?? true, ipv6: options.ipv6 ?? true,
    logDropped: options.logDropped ?? false, flush: options.flush ?? true, format: options.format ?? "file", sshPort: options.sshPort ?? 22, comments: options.comments ?? true,
  };
  let rules: Rule[];
  try {
    rules = parseRules(input);
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
  const warn = warnings(rules, o).map((w) => `# ${w}`);
  const body = o.backend === "ufw" ? ufwCommands(rules, o) : o.backend === "iptables" ? iptables(rules, o) : o.backend === "nftables" ? nftables(rules, o) : firewalld(rules, o);
  const head = o.backend === "iptables" && o.format === "file" ? ["# Review before applying. A mistake here can cut off your own access.", ...warn, ""] : ["#!/bin/sh", "# Review before running. A mistake here can cut off your own access.", ...warn, ""];
  if (o.backend === "nftables" && o.format === "file") return { output: [body[0]!, ...warn, ...body.slice(1)].join("\n") + "\n", error: null };
  return { output: [...head, ...body].join("\n") + "\n", error: null };
}
