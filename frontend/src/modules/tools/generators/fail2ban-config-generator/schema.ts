import { z } from "zod";

export const fail2banConfigGeneratorOptionsSchema = z.object({
  preset: z.enum(["custom", "sshd", "nginx-http-auth", "nginx-botsearch", "nginx-limit-req", "apache-auth", "apache-badbots", "postfix", "dovecot", "recidive"]).default("sshd"),
  /** Jail (and filter) name for custom jails */
  jailName: z.string().default("myapp"),
  port: z.string().default(""),
  logpath: z.string().default(""),
  maxretry: z.number().int().min(1).max(1000).default(5),
  findtime: z.string().default("10m"),
  bantime: z.string().default("1h"),
  ignoreip: z.string().default("127.0.0.1/8 ::1"),
  banaction: z.enum(["default", "iptables-multiport", "iptables-allports", "nftables-multiport", "nftables-allports", "ufw", "firewallcmd-rich-rules"]).default("default"),
  backend: z.enum(["auto", "polling", "systemd", "pyinotify"]).default("auto"),
  /** sshd filter mode */
  sshdMode: z.enum(["normal", "ddos", "extra", "aggressive"]).default("normal"),
  increment: z.boolean().default(false),
  incrementFactor: z.number().int().min(1).max(100).default(2),
  maxBantime: z.string().default("5w"),
  destemail: z.string().default(""),
  report: z.enum(["mw", "mwl"]).default("mw"),
});
export type Fail2banConfigGeneratorOptions = z.infer<typeof fail2banConfigGeneratorOptionsSchema>;
