import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { PublicHashDto, PublicHashResult, PublicJsonValidateDto, PublicJsonValidateResult } from "@devtoolbox/shared";

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
