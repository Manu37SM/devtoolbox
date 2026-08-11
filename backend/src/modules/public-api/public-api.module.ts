import { Module } from "@nestjs/common";
import { PublicApiController } from "./public-api.controller";
import { PublicApiService } from "./public-api.service";
import { ApiKeysModule } from "../api-keys/api-keys.module";

/** API.md §12 — the API-key-authed tool surface, kept as its own module
 * (rather than folded into ApiKeysModule) so key management stays reachable
 * on session auth even if this module's routes ever need independent
 * scaling/deploy characteristics. Imports ApiKeysModule for ApiKeyAuthGuard. */
@Module({
  imports: [ApiKeysModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
})
export class PublicApiModule {}
