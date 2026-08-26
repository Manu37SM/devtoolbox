import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfBlockedError";
  }
}

const MAX_REDIRECTS = 5;

export async function assertUrlIsSafe(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError("Not a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError(`Scheme "${url.protocol}" is not allowed — only http/https.`);
  }

  const hostname =
    url.hostname.startsWith("[") && url.hostname.endsWith("]") ? url.hostname.slice(1, -1) : url.hostname;

  if (isIP(hostname)) {
    if (isDisallowedIp(hostname)) {
      throw new SsrfBlockedError("This address is not allowed (internal/reserved IP range).");
    }
    return url;
  }

  let resolved: { address: string; family: number };
  try {
    resolved = await lookup(hostname);
  } catch {
    throw new SsrfBlockedError(`Could not resolve hostname "${hostname}".`);
  }

  if (isDisallowedIp(resolved.address)) {
    throw new SsrfBlockedError("This address is not allowed (internal/reserved IP range).");
  }

  return url;
}

export async function safeFetch(rawUrl: string, init: RequestInit & { timeoutMs: number }): Promise<Response> {
  let currentUrl = rawUrl;
  const { timeoutMs, ...requestInit } = init;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const safeUrl = await assertUrlIsSafe(currentUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(safeUrl, { ...requestInit, redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get("location");
    if (isRedirect && location) {
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    return response;
  }

  throw new SsrfBlockedError(`Too many redirects (max ${MAX_REDIRECTS}).`);
}

function isDisallowedIp(address: string): boolean {
  return isIP(address) === 4 ? isDisallowedIpv4(address) : isDisallowedIpv6(address);
}

function isDisallowedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true;

  const [a, b] = octets as [number, number, number, number];

  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a >= 224) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isDisallowedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::1") return true;
  if (normalized === "::") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true;
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("ff")) return true;

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isDisallowedIpv4(mapped[1]!);

  return false;
}
