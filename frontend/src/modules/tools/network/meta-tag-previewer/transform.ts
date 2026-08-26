import type { UrlPreviewDto, UrlPreviewResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";

export async function previewUrl(dto: UrlPreviewDto): Promise<UrlPreviewResult> {
  return apiPost<UrlPreviewResult>("/net/url-preview", dto);
}
