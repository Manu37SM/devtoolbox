import type { DnsLookupDto, DnsLookupResult } from "@devtoolbox/shared";
import { apiGet } from "@/lib/api-client";

export async function lookupDns(dto: DnsLookupDto): Promise<DnsLookupResult> {
  const params = new URLSearchParams({ domain: dto.domain, recordType: dto.recordType });
  return apiGet<DnsLookupResult>(`/net/dns?${params.toString()}`);
}
