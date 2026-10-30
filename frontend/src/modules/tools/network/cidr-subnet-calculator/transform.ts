import type { CidrSubnetCalculatorOptions } from "./schema";

export interface CidrSubnetResult {
  networkAddress: string;
  broadcastAddress: string;
  subnetMask: string;
  wildcardMask: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  prefixLength: number;
  /** Explains platform-reserved addresses, when a cloud platform is selected. */
  platformNote?: string;
  binary?: { address: string; mask: string; network: string };
  /** Subnets from splitting the block (capped at MAX_SPLIT rows). */
  subnets?: { cidr: string; first: string; last: string; usable: number }[];
  /** Total number of subnets the split produces, which can exceed subnets.length. */
  subnetCount?: number;
  error: string | null;
}

export const MAX_SPLIT = 1024;

const PLATFORMS = {
  standard: { firstOffset: 1, lastOffset: 1, note: "" },
  aws: { firstOffset: 4, lastOffset: 1, note: "AWS reserves the first four addresses (network, VPC router, DNS, future use) and the broadcast address." },
  azure: { firstOffset: 4, lastOffset: 1, note: "Azure reserves the first four addresses (network, gateway, two for DNS) and the broadcast address." },
  gcp: { firstOffset: 2, lastOffset: 2, note: "Google Cloud reserves the network, gateway, second-to-last and broadcast addresses." },
} as const;

/** First and last usable address and the usable count for a block on a platform. */
function usableRange(network: number, broadcast: number, prefix: number, platform: keyof typeof PLATFORMS) {
  if (prefix === 32) return { first: network, last: network, usable: 1 };
  if (prefix === 31 && platform === "standard") return { first: network, last: broadcast, usable: 2 };
  const p = PLATFORMS[platform];
  const usable = broadcast - network + 1 - p.firstOffset - p.lastOffset;
  if (usable <= 0) return { first: network, last: network, usable: 0 };
  return { first: network + p.firstOffset, last: broadcast - p.lastOffset, usable };
}

const bin = (n: number) => (n >>> 0).toString(2).padStart(32, "0").match(/.{8}/g)!.join(".");

const EMPTY_RESULT: Omit<CidrSubnetResult, "error"> = {
  networkAddress: "",
  broadcastAddress: "",
  subnetMask: "",
  wildcardMask: "",
  firstHost: "",
  lastHost: "",
  totalHosts: 0,
  usableHosts: 0,
  prefixLength: 0,
};

function errorResult(message: string): CidrSubnetResult {
  return { ...EMPTY_RESULT, error: message };
}

function ipToInt(octets: readonly number[]): number {
  return (((octets[0]! << 24) | (octets[1]! << 16) | (octets[2]! << 8) | octets[3]!) >>> 0);
}

function intToIp(value: number): string {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff].join(".");
}

function parseCidr(input: string): { octets: number[]; prefix: number } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Enter a CIDR block, e.g. 192.168.1.0/24." };

  // Accept "10.0.0.0 255.255.255.0" and "10.0.0.0/255.255.0.0" as well as /prefix.
  const maskForm = /^(\S+)\s*(?:\/|\s)\s*(\d{1,3}(?:\.\d{1,3}){3})$/.exec(trimmed);
  if (maskForm) {
    const m = maskForm[2]!.split(".").map(Number);
    if (m.some((o) => o > 255)) return { error: `Invalid subnet mask "${maskForm[2]}".` };
    const maskInt = ipToInt(m);
    const prefixFromMask = 32 - Math.log2(((~maskInt) >>> 0) + 1);
    if (!Number.isInteger(prefixFromMask)) return { error: `"${maskForm[2]}" is not a contiguous subnet mask.` };
    return parseCidr(`${maskForm[1]}/${prefixFromMask}`);
  }
  const parts = trimmed.split("/");
  if (parts.length !== 2) {
    return { error: "Expected CIDR notation in the form address/prefix, e.g. 192.168.1.0/24." };
  }

  const address = parts[0]!;
  const prefixStr = parts[1]!;
  const octetStrs = address.split(".");
  if (octetStrs.length !== 4) {
    return { error: "IPv4 address must have exactly 4 octets, e.g. 192.168.1.0." };
  }

  const octets: number[] = [];
  for (const s of octetStrs) {
    if (!/^\d+$/.test(s)) return { error: `Invalid octet "${s}": must be a number between 0 and 255.` };
    const n = Number(s);
    if (n < 0 || n > 255) return { error: `Invalid octet "${s}": must be between 0 and 255.` };
    octets.push(n);
  }

  if (!/^\d+$/.test(prefixStr)) return { error: `Invalid prefix length "${prefixStr}".` };
  const prefix = Number(prefixStr);
  if (prefix < 0 || prefix > 32) return { error: "Prefix length must be between 0 and 32." };

  return { octets, prefix };
}

export function calculateCidrSubnet(cidr: string, options: Partial<CidrSubnetCalculatorOptions> = {}): CidrSubnetResult {
  const parsed = parseCidr(cidr);
  if ("error" in parsed) return errorResult(parsed.error);

  const { octets, prefix } = parsed;
  const ipInt = ipToInt(octets);
  const maskInt = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const totalHosts = 2 ** (32 - prefix);

  const platform = options.platform ?? "standard";
  const range = usableRange(networkInt, broadcastInt, prefix, platform);
  const firstHostInt = range.first >>> 0;
  const lastHostInt = range.last >>> 0;
  const usableHosts = range.usable;

  let subnets: CidrSubnetResult["subnets"];
  let subnetCount: number | undefined;
  const split = options.splitPrefix ?? 0;
  if (split > 0) {
    if (split < prefix) return errorResult(`Can't split a /${prefix} into larger /${split} subnets — pick a prefix of ${prefix} or more.`);
    subnetCount = 2 ** (split - prefix);
    const size = 2 ** (32 - split);
    subnets = [];
    for (let k = 0; k < Math.min(subnetCount, MAX_SPLIT); k++) {
      const net = networkInt + k * size;
      const r = usableRange(net, net + size - 1, split, platform);
      subnets.push({ cidr: `${intToIp(net)}/${split}`, first: intToIp(r.first), last: intToIp(r.last), usable: r.usable });
    }
  }

  return {
    networkAddress: intToIp(networkInt),
    broadcastAddress: intToIp(broadcastInt),
    subnetMask: intToIp(maskInt),
    wildcardMask: intToIp(wildcardInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    totalHosts,
    usableHosts,
    prefixLength: prefix,
    ...(platform !== "standard" ? { platformNote: PLATFORMS[platform].note } : {}),
    ...(options.showBinary ? { binary: { address: bin(ipInt), mask: bin(maskInt), network: bin(networkInt) } } : {}),
    ...(subnets ? { subnets, subnetCount } : {}),
    error: null,
  };
}
