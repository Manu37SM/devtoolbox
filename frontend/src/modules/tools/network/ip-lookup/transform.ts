import type { IpLookupDto, IpLookupResult } from "@devtoolbox/shared";
import { apiGet } from "@/lib/api-client";

export async function lookupIp(dto: IpLookupDto): Promise<IpLookupResult> {
  if (!dto.ip) return apiGet<IpLookupResult>("/net/ip-lookup");
  const params = new URLSearchParams({ ip: dto.ip });
  return apiGet<IpLookupResult>(`/net/ip-lookup?${params.toString()}`);
}
