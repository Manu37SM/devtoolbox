import type { UrlPreviewDto, UrlPreviewResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";

/** Fetches a URL server-side and extracts its Open Graph/meta tags
 * (API.md §10) — fetching an arbitrary third-party URL's HTML is blocked
 * by CORS for almost every site, so this has to happen server-side. Thin
 * call-forwarding wrapper; errors propagate as `ApiClientError`. */
export async function previewUrl(dto: UrlPreviewDto): Promise<UrlPreviewResult> {
  return apiPost<UrlPreviewResult>("/net/url-preview", dto);
}
