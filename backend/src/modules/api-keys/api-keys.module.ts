import { Module } from "@nestjs/common";
import { ApiKeysController } from "./api-keys.controller";
import { ApiKeysService } from "./api-keys.service";
import { ApiKeyAuthGuard } from "./guards/api-key-auth.guard";

/** API.md §11 (key management, session-authed). Exports ApiKeysService and
 * ApiKeyAuthGuard so PublicApiModule (§12) can guard its routes with the
 * same key-validation logic without duplicating it. */
@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
