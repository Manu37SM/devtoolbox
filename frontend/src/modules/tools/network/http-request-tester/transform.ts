import type { HttpRequestProxyDto, HttpRequestProxyResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";

export async function sendHttpRequest(dto: HttpRequestProxyDto): Promise<HttpRequestProxyResult> {
  return apiPost<HttpRequestProxyResult>("/net/http-request", dto);
}
