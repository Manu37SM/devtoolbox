import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF protection for the Module 8 network-tool proxies (HTTP Request
 * Tester, URL Previewer — anything that fetches a user-supplied URL from
 * the server). See ARCHITECTURE.md §9 ("Security Considerations") and
 * CLAUDE.md rule 6 (security-sensitive surfaces need extra care).
 *
 * Threat model: a malicious user points the proxy at an internal address
 * (localhost, a cloud metadata endpoint like 169.254.169.254, a private
 * RFC1918 range reachable from our infra, etc.) to read internal services
 * through our server as a confused deputy.
 *
 * What this DOES do:
 * - Only allows http/https schemes.
 * - Resolves the hostname and rejects it if the resolved IP is loopback,
 *   private, link-local, unique-local (IPv6), multicast, or otherwise
 *   reserved (checked against the real RFC ranges below, not a hand-wavy
 *   "starts with 10." check).
 * - Manually walks redirects (`redirect: "manual"` at the fetch call site)
 *   and re-runs this same check against each redirect target before
 *   following it, up to a small max hop count — otherwise an attacker
 *   could point at a public URL that 302s to an internal one.
 *
 * What this DOES NOT fully close (documented, known v1 limitation): a
 * classic DNS-rebinding attack, where the hostname resolves to a public IP
 * at check time but a different (private) IP by the time the actual
 * `fetch()` call re-resolves it a few milliseconds later. Closing this
 * completely requires pinning the fetch to the exact IP we validated (a
 * custom undici `Agent`/connector), which needs surgery on how `fetch`
 * resolves connections and wasn't justified for a first pass — the window
 * is small (single-digit milliseconds) and the resolved-IP check still
 * blocks the overwhelming majority of realistic SSRF attempts (anyone
 * pointing directly at an internal hostname/IP, which is the common case).
 * Tracked as a follow-up, not silently ignored.
 */
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

  // URL.hostname serializes IPv6 literals with brackets (e.g. "[::1]"),
  // which node:net's isIP() doesn't recognize — strip them before checking.
  const hostname =
    url.hostname.startsWith("[") && url.hostname.endsWith("]") ? url.hostname.slice(1, -1) : url.hostname;

  // A literal IP in the URL (no DNS lookup needed) — check it directly.
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

/** Fetches with manual redirect handling, re-checking every hop against
 * `assertUrlIsSafe` before following it. Use this instead of calling
 * `fetch` directly from any server-proxy route. */
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
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true; // malformed -> reject

  const [a, b] = octets as [number, number, number, number];

  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. cloud metadata 169.254.169.254)
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 carrier-grade NAT

  return false;
}

function isDisallowedIpv6(address: string): boolean {
  const normalized = address.toLowerCase();

  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true; // unspecified
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9")) return true; // link-local fe80::/10
  if (normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // link-local fe80::/10 (remaining prefixes)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7 unique-local
  if (normalized.startsWith("ff")) return true; // ff00::/8 multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — unwrap and re-check as IPv4.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isDisallowedIpv4(mapped[1]!);

  return false;
}
