import type { TransformResult } from "@/lib/tool-transform";
import type { IdDecoderOptions } from "./schema";

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const GREGORIAN_TO_UNIX_MS = 12219292800000n; // 1582-10-15 -> 1970-01-01
const TWITTER_EPOCH = 1288834974657n;
const DISCORD_EPOCH = 1420070400000n;

export type DecodedKind = "uuid" | "ulid" | "objectid" | "twitter" | "discord";

const iso = (ms: bigint): string => {
  const n = Number(ms);
  const d = new Date(n);
  return Number.isFinite(n) && !Number.isNaN(d.getTime()) ? d.toISOString() : "out of range";
};

export function decodeUuid(raw: string): string[] | null {
  const hex = raw.trim().replace(/^urn:uuid:/i, "").replace(/[{}-]/g, "").toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) return null;
  const canon = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  const lines = [`Type: UUID`, `Canonical: ${canon}`];
  if (hex === "0".repeat(32)) return [...lines, "Special: nil UUID"];
  if (hex === "f".repeat(32)) return [...lines, "Special: max UUID"];
  const version = parseInt(hex[12]!, 16);
  const v = parseInt(hex[16]!, 16);
  const variant = v < 8 ? "NCS (reserved)" : v < 12 ? "RFC 4122 / 9562" : v < 14 ? "Microsoft (reserved)" : "future (reserved)";
  lines.push(`Version: ${version}`, `Variant: ${variant}`);
  if (version === 1) {
    const ticks = BigInt("0x" + hex.slice(13, 16) + hex.slice(8, 12) + hex.slice(0, 8));
    lines.push(`Timestamp: ${iso(ticks / 10000n - GREGORIAN_TO_UNIX_MS)}`, `Clock sequence: ${parseInt(hex.slice(16, 20), 16) & 0x3fff}`, `Node: ${hex.slice(20).replace(/(..)(?=.)/g, "$1:")}`);
  } else if (version === 6) {
    const ticks = BigInt("0x" + hex.slice(0, 8) + hex.slice(8, 12) + hex.slice(13, 16));
    lines.push(`Timestamp: ${iso(ticks / 10000n - GREGORIAN_TO_UNIX_MS)}`, `Node: ${hex.slice(20).replace(/(..)(?=.)/g, "$1:")}`);
  } else if (version === 7) {
    lines.push(`Timestamp: ${iso(BigInt("0x" + hex.slice(0, 12)))}`);
  } else if (version === 4) lines.push("Random (no embedded data)");
  else if (version === 3) lines.push("Name-based (MD5 hash)");
  else if (version === 5) lines.push("Name-based (SHA-1 hash)");
  else if (version === 2) lines.push("DCE security");
  else if (version === 8) lines.push("Custom / vendor-specific");
  return lines;
}

export function decodeUlid(raw: string): string[] | null {
  const s = raw.trim().toUpperCase();
  if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s) || s[0]! > "7") return null;
  let ms = 0n;
  for (const ch of s.slice(0, 10)) ms = ms * 32n + BigInt(CROCKFORD.indexOf(ch));
  return ["Type: ULID", `Timestamp: ${iso(ms)}`, `Unix ms: ${ms}`, `Randomness: ${s.slice(10)}`];
}

export function decodeObjectId(raw: string): string[] | null {
  const s = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{24}$/.test(s)) return null;
  return ["Type: MongoDB ObjectId", `Timestamp: ${iso(BigInt(parseInt(s.slice(0, 8), 16)) * 1000n)}`, `Random value: ${s.slice(8, 18)}`, `Counter: ${parseInt(s.slice(18), 16)}`];
}

export function decodeSnowflake(raw: string, flavor: "twitter" | "discord"): string[] | null {
  const s = raw.trim();
  if (!/^\d{15,20}$/.test(s)) return null;
  const id = BigInt(s);
  if (id >= 1n << 64n) return null;
  const epoch = flavor === "twitter" ? TWITTER_EPOCH : DISCORD_EPOCH;
  const ts = (id >> 22n) + epoch;
  const seq = id & 0xfffn;
  const a = (id >> 17n) & 0x1fn;
  const b = (id >> 12n) & 0x1fn;
  return flavor === "twitter"
    ? ["Type: Twitter/X Snowflake", `Timestamp: ${iso(ts)}`, `Datacenter: ${a}`, `Worker: ${b}`, `Sequence: ${seq}`]
    : ["Type: Discord Snowflake", `Timestamp: ${iso(ts)}`, `Worker: ${a}`, `Process: ${b}`, `Increment: ${seq}`];
}

function decodeLine(line: string, mode: IdDecoderOptions["mode"]): string[] | null {
  const t = line.trim();
  switch (mode) {
    case "uuid": return decodeUuid(t);
    case "ulid": return decodeUlid(t);
    case "objectid": return decodeObjectId(t);
    case "twitter": return decodeSnowflake(t, "twitter");
    case "discord": return decodeSnowflake(t, "discord");
  }
  if (/^[0-9a-f]{24}$/i.test(t)) return decodeObjectId(t);
  const u = decodeUuid(t);
  if (u) return u;
  const ul = decodeUlid(t);
  if (ul) return ul;
  if (/^\d{15,20}$/.test(t)) {
    return [...decodeSnowflake(t, "twitter")!, "--- or, if it is a Discord ID ---", ...decodeSnowflake(t, "discord")!];
  }
  return null;
}

export function decodeId(input: string, options: IdDecoderOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const blocks: string[] = [];
  const bad: string[] = [];
  for (const l of lines) {
    const r = decodeLine(l, options.mode);
    if (r) blocks.push([`> ${l}`, ...r].join("\n"));
    else bad.push(l);
  }
  const output = blocks.join("\n\n");
  if (bad.length) {
    return { output, error: { message: `Could not recognise: ${bad.slice(0, 3).join(", ")}${bad.length > 3 ? "…" : ""}` } };
  }
  return { output, error: null };
}
