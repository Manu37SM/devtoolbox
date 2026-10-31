import { z } from "zod";

export const firewallRuleBuilderOptionsSchema = z.object({
  backend: z.enum(["ufw", "iptables", "nftables", "firewalld"]).default("ufw"),
  defaultIn: z.enum(["drop", "reject", "accept"]).default("drop"),
  defaultOut: z.enum(["accept", "drop"]).default("accept"),
  allowLoopback: z.boolean().default(true),
  allowEstablished: z.boolean().default(true),
  dropInvalid: z.boolean().default(true),
  /** Answer ping (ICMP echo request) */
  allowPing: z.boolean().default(true),
  /** Also generate IPv6 rules (iptables writes a second ip6tables block) */
  ipv6: z.boolean().default(true),
  /** Log dropped packets, rate limited */
  logDropped: z.boolean().default(false),
  /** Start by removing existing rules (ufw reset, iptables -F, nft delete table) */
  flush: z.boolean().default(true),
  /** iptables / nftables: a ruleset file for iptables-restore or nft -f, or individual commands */
  format: z.enum(["file", "commands"]).default("file"),
  /** SSH port used by the lock-out warning */
  sshPort: z.number().int().min(1).max(65535).default(22),
  comments: z.boolean().default(true),
});
export type FirewallRuleBuilderOptions = z.infer<typeof firewallRuleBuilderOptionsSchema>;
