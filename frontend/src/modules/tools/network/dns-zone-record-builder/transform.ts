import type { TransformResult } from "@/lib/tool-transform";
import type { DnsZoneRecordBuilderOptions } from "./schema";

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;
const NAME = /^(@|\*|(\*\.)?[A-Za-z0-9_]([A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?(\.[A-Za-z0-9_]([A-Za-z0-9_-]{0,61}[A-Za-z0-9_])?)*\.?)$/;
const TYPES = new Set(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"]);

const target = (t: string, auto: boolean) => (auto && t.includes(".") && !t.endsWith(".") ? t + "." : t);
const fail = (message: string, line: number): TransformResult => ({ output: "", error: { message, line } });

function txt(value: string): string {
  const raw = /^".*"$/s.test(value) ? value.slice(1, -1) : value;
  const esc = raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const chunks = esc.match(/.{1,255}/gs) ?? [""];
  return chunks.map((c) => `"${c}"`).join(" ");
}

/** Input lines: `<name> <TYPE> <value...>` e.g. `www A 203.0.113.10`, `@ MX 10 mail.example.com.`, `@ TXT v=spf1 -all`. */
export function buildZone(input: string, o: DnsZoneRecordBuilderOptions): TransformResult {
  const rows: string[][] = [];
  const notes: string[] = [];
  const cnames = new Set<string>(), others = new Set<string>();
  for (const [i, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/\s+;.*$/, "").trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;
    const m = /^(\S+)\s+(?:(\d+)\s+)?([A-Za-z]+)\s+(.+)$/.exec(line);
    if (!m) return fail('Expected "<name> [ttl] <TYPE> <value>"', i + 1);
    const [, name, ttlText, t, rest] = m as unknown as [string, string, string | undefined, string, string];
    const type = t.toUpperCase();
    if (!TYPES.has(type)) return fail(`Unsupported type "${t}" (supported: ${[...TYPES].join(", ")})`, i + 1);
    if (!NAME.test(name)) return fail(`Invalid record name "${name}"`, i + 1);
    const ttl = ttlText ?? String(o.ttl);
    const v = rest.trim();
    let data: string;
    switch (type) {
      case "A": if (!IPV4.test(v)) return fail(`Invalid IPv4 address "${v}"`, i + 1); data = v; break;
      case "AAAA": if (!(IPV6.test(v) && v.includes(":") && v.split("::").length <= 2)) return fail(`Invalid IPv6 address "${v}"`, i + 1); data = v; break;
      case "CNAME": case "NS": case "PTR": if (!NAME.test(v)) return fail(`Invalid target "${v}"`, i + 1); data = target(v, o.autoDot); break;
      case "MX": { const p = /^(\d+)\s+(\S+)$/.exec(v); if (!p || Number(p[1]) > 65535) return fail('MX needs "<priority 0-65535> <host>"', i + 1); data = `${p[1]} ${target(p[2]!, o.autoDot)}`; break; }
      case "SRV": { const p = /^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)$/.exec(v); if (!p || p.slice(1, 4).some((n) => Number(n) > 65535)) return fail('SRV needs "<priority> <weight> <port> <target>"', i + 1); data = `${p[1]} ${p[2]} ${p[3]} ${target(p[4]!, o.autoDot)}`; break; }
      case "CAA": { const p = /^(\d+)\s+(issue|issuewild|iodef)\s+"?([^"]*)"?$/i.exec(v); if (!p) return fail('CAA needs "<flags> <issue|issuewild|iodef> <value>"', i + 1); data = `${p[1]} ${p[2]!.toLowerCase()} "${p[3]}"`; break; }
      default: data = txt(v);
    }
    if (type === "CNAME") { if (others.has(name)) return fail(`CNAME at "${name}" cannot coexist with other records`, i + 1); cnames.add(name); }
    else { if (cnames.has(name)) return fail(`"${name}" already has a CNAME; no other record types are allowed alongside it`, i + 1); others.add(name); }
    if (type === "CNAME" && name === "@") return fail("A CNAME cannot be used at the zone apex (@); use an ALIAS/ANAME or A records", i + 1);
    if (type === "MX" && /^\d+\.\d+\.\d+\.\d+\.?$/.test(data.split(" ")[1]!)) return fail("MX target must be a hostname, not an IP address", i + 1);
    if ((type === "MX" || type === "NS" || type === "CNAME") && !data.endsWith(".") && data.includes(".")) notes.push(`; line ${i + 1}: target "${data.split(" ").pop()}" is relative to the zone origin; add a trailing dot if it is a full hostname`);
    rows.push([name, ttl, "IN", type, data]);
  }
  if (!rows.length) return { output: "", error: null };
  const w = o.alignColumns ? [0, 1, 2, 3].map((c) => Math.max(...rows.map((r) => r[c]!.length))) : [0, 0, 0, 0];
  const lines = rows.map((r) => [0, 1, 2, 3].map((c) => r[c]!.padEnd(w[c]!)).join(" ") + " " + r[4]);
  return { output: ["$TTL " + o.ttl, ...lines, ...notes].join("\n") + "\n", error: null };
}
