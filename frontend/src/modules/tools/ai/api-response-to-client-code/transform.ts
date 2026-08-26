import type { AiClientCodeResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { ApiResponseToClientCodeOptions } from "./schema";

export async function generateClientCode(options: ApiResponseToClientCodeOptions): Promise<AiClientCodeResult> {
  return apiPost<AiClientCodeResult>("/ai/client-code", {
    sampleResponse: options.sampleResponse,
    target: options.target,
    typeName: options.typeName,
  });
}
