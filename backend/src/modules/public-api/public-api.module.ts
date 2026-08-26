import { Module } from "@nestjs/common";
import { PublicApiController } from "./public-api.controller";
import { PublicApiService } from "./public-api.service";
import { ApiKeysModule } from "../api-keys/api-keys.module";

@Module({
  imports: [ApiKeysModule],
  controllers: [PublicApiController],
  providers: [PublicApiService],
})
export class PublicApiModule {}
