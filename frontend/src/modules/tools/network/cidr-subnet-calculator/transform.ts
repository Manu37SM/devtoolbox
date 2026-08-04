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
  error: string | null;
}

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

/** Computes IPv4 subnet details (network/broadcast/mask/host range) from
 * CIDR notation using 32-bit unsigned bitwise arithmetic. */
export function calculateCidrSubnet(cidr: string): CidrSubnetResult {
  const parsed = parseCidr(cidr);
  if ("error" in parsed) return errorResult(parsed.error);

  const { octets, prefix } = parsed;
  const ipInt = ipToInt(octets);
  const maskInt = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const totalHosts = 2 ** (32 - prefix);

  let firstHostInt: number;
  let lastHostInt: number;
  let usableHosts: number;

  if (prefix === 32) {
    firstHostInt = networkInt;
    lastHostInt = networkInt;
    usableHosts = 1;
  } else if (prefix === 31) {
    firstHostInt = networkInt;
    lastHostInt = broadcastInt;
    usableHosts = 2;
  } else {
    firstHostInt = (networkInt + 1) >>> 0;
    lastHostInt = (broadcastInt - 1) >>> 0;
    usableHosts = totalHosts - 2;
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
    error: null,
  };
}
