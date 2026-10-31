import type { TransformResult } from "@/lib/tool-transform";
import type { Fail2banConfigGeneratorOptions } from "./schema";

const TIME = /^(-1|(\d+(s|sec|second|m|min|minute|h|hr|hour|d|day|w|week|mo|month|y|year)?)+)$/i;
const PRESETS: Record<string, { port: string; logpath: string; note?: string }> = {
  sshd: { port: "ssh", logpath: "/var/log/auth.log" },
  "nginx-http-auth": { port: "http,https", logpath: "/var/log/nginx/error.log" },
  "nginx-botsearch": { port: "http,https", logpath: "/var/log/nginx/access.log" },
  "nginx-limit-req": { port: "http,https", logpath: "/var/log/nginx/error.log" },
  "apache-auth": { port: "http,https", logpath: "/var/log/apache2/error.log" },
  "apache-badbots": { port: "http,https", logpath: "/var/log/apache2/access.log" },
  postfix: { port: "smtp,465,submission", logpath: "/var/log/mail.log" },
  dovecot: { port: "pop3,pop3s,imap,imaps,submission,465,sieve", logpath: "/var/log/mail.log" },
  recidive: { port: "all", logpath: "/var/log/fail2ban.log" },
};

export function fail2banConfigGenerator(input: string, options: Partial<Fail2banConfigGeneratorOptions> = {}): TransformResult {
  const o: Fail2banConfigGeneratorOptions = {
    preset: options.preset ?? "sshd", jailName: options.jailName ?? "myapp", port: options.port ?? "", logpath: options.logpath ?? "", maxretry: options.maxretry ?? 5,
    findtime: options.findtime ?? "10m", bantime: options.bantime ?? "1h", ignoreip: options.ignoreip ?? "127.0.0.1/8 ::1", banaction: options.banaction ?? "default",
    backend: options.backend ?? "auto", sshdMode: options.sshdMode ?? "normal", increment: options.increment ?? false, incrementFactor: options.incrementFactor ?? 2,
    maxBantime: options.maxBantime ?? "5w", destemail: options.destemail ?? "", report: options.report ?? "mw",
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const custom = o.preset === "custom";
  const name = custom ? o.jailName.trim() : o.preset;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) return fail("Jail name may contain letters, digits, - _ and . (and must not start with punctuation).");
  for (const [label, v] of [["Find time", o.findtime], ["Ban time", o.bantime], ["Max ban time", o.maxBantime]] as const)
    if (!TIME.test(v.trim())) return fail(`${label} "${v}" must be seconds or a duration like 10m, 1h, 2d, 1w (or -1 for permanent).`);
  if (!/^[\w\s.:/,-]*$/.test(o.ignoreip)) return fail("ignoreip may contain addresses, CIDR ranges and host names separated by spaces.");
  if (o.destemail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.destemail)) return fail("Destination e-mail is not a valid address.");

  const regexes = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (custom) {
    if (!regexes.length) return { output: "", error: null };
    for (const [i, r] of regexes.entries()) {
      if (!/<(HOST|ADDR|F-[A-Z0-9_]+)(\/[^>]*)?>/.test(r)) return fail(`failregex ${i + 1} must contain <HOST> (or <ADDR>) where the offending IP appears.`);
      let depth = 0;
      for (const ch of r.replace(/\\./g, "")) { if (ch === "(") depth++; if (ch === ")") depth--; if (depth < 0) break; }
      if (depth !== 0) return fail(`failregex ${i + 1} has unbalanced parentheses.`);
    }
    if (!o.logpath) return fail("A custom jail needs a log path, e.g. /var/log/myapp/auth.log.");
  }
  const preset = PRESETS[o.preset];
  const port = o.port || preset?.port || "http,https";
  const logpath = o.logpath || preset?.logpath || "";

  const d: string[] = ["[DEFAULT]"];
  if (o.ignoreip.trim()) d.push(`ignoreip = ${o.ignoreip.trim().replace(/\s+/g, " ")}`);
  if (o.banaction !== "default") d.push(`banaction = ${o.banaction}`, ...(o.banaction.endsWith("-multiport") ? [`banaction_allports = ${o.banaction.replace("multiport", "allports")}`] : []));
  if (o.increment) d.push("bantime.increment = true", `bantime.factor = ${o.incrementFactor}`, `bantime.maxtime = ${o.maxBantime}`);
  if (o.destemail) d.push(`destemail = ${o.destemail}`, `action = %(action_${o.report})s`);
  const J: string[] = [`[${name}]`, "enabled = true"];
  if (o.preset === "sshd" && o.sshdMode !== "normal") J.push(`mode = ${o.sshdMode}`);
  J.push(`port = ${port}`);
  if (custom || o.preset !== "sshd") J.push(`filter = ${name}${o.preset === "sshd" ? "" : ""}`);
  J.push(`logpath = ${logpath}`);
  if (o.backend !== "auto") J.push(`backend = ${o.backend}`);
  J.push(`maxretry = ${o.maxretry}`, `findtime = ${o.findtime.trim()}`, `bantime = ${o.bantime.trim()}`);

  const out = ["# ---- /etc/fail2ban/jail.local ----", ...(d.length > 1 ? [...d, ""] : []), ...J];
  if (custom) {
    out.push("", `# ---- /etc/fail2ban/filter.d/${name}.conf ----`, "[Definition]", `failregex = ${regexes[0]}`, ...regexes.slice(1).map((r) => `            ${r}`), "ignoreregex =");
    out.push("", `# Test the filter:   fail2ban-regex ${logpath} /etc/fail2ban/filter.d/${name}.conf`);
  }
  out.push("", "# Apply:  sudo systemctl restart fail2ban   (check with: sudo fail2ban-client status " + name + ")");
  if (o.preset === "recidive") out.push("# recidive reads fail2ban's own log; bantime 1w and findtime 1d are typical.");
  return { output: out.join("\n") + "\n", error: null };
}
