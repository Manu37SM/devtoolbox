import type { HttpRequestProxyDto, HttpRequestProxyResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";

/** Sends the user-configured HTTP request through the backend proxy
 * (API.md §10 — required because the browser can't bypass CORS or hide
 * the caller's IP from the target server). Thin call-forwarding wrapper,
 * not a pure transform — errors (network failure, non-2xx from our own
 * API) propagate as `ApiClientError` for the ToolView to display. */
export async function sendHttpRequest(dto: HttpRequestProxyDto): Promise<HttpRequestProxyResult> {
  return apiPost<HttpRequestProxyResult>("/net/http-request", dto);
}
