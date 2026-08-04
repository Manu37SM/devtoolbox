import type { IpLookupDto, IpLookupResult } from "@devtoolbox/shared";
import { apiGet } from "@/lib/api-client";

/** Looks up geolocation/ASN info for an IP (or the caller's own IP when
 * omitted) via the backend proxy (API.md §10) — a browser tab has no way
 * to determine its own public IP or geolocate an arbitrary IP on its own.
 * Thin call-forwarding wrapper; errors propagate as `ApiClientError`. */
export async function lookupIp(dto: IpLookupDto): Promise<IpLookupResult> {
  if (!dto.ip) return apiGet<IpLookupResult>("/net/ip-lookup");
  const params = new URLSearchParams({ ip: dto.ip });
  return apiGet<IpLookupResult>(`/net/ip-lookup?${params.toString()}`);
}
