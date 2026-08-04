import type { DnsLookupDto, DnsLookupResult } from "@devtoolbox/shared";
import { apiGet } from "@/lib/api-client";

/** Looks up DNS records for a domain via the backend proxy (API.md §10) —
 * DNS resolution isn't available to browser JavaScript at all, so this
 * always requires a server round-trip. Thin call-forwarding wrapper;
 * errors propagate as `ApiClientError`. */
export async function lookupDns(dto: DnsLookupDto): Promise<DnsLookupResult> {
  const params = new URLSearchParams({ domain: dto.domain, recordType: dto.recordType });
  return apiGet<DnsLookupResult>(`/net/dns?${params.toString()}`);
}
