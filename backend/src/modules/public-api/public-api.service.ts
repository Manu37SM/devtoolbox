import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PublicHashDto, PublicHashResult, PublicJsonValidateDto, PublicJsonValidateResult } from "@devtoolbox/shared";

/**
 * The two example tools ARCHITECTURE.md §14.3 names for the Public API tier
 * ("batch JSON validation, hash generation") — deliberately not a mirror of
 * every web tool (API.md §12). Both are pure, stateless transforms; nothing
 * here is persisted, matching CLAUDE.md rule 1's spirit even though this is
 * a server surface by design (the whole point of the Public API is
 * server-side execution for CI/scripting use, not a proxy for a
 * client-side-capable tool).
 */
@Injectable()
export class PublicApiService {
  hash(dto: PublicHashDto): PublicHashResult {
    return { digest: createHash(dto.algorithm).update(dto.input).digest("hex") };
  }

  jsonValidate(dto: PublicJsonValidateDto): PublicJsonValidateResult {
    try {
      JSON.parse(dto.input);
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : "Invalid JSON." };
    }
  }
}
