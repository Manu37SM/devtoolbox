import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Requires a valid `Authorization: Bearer <accessToken>` header. Apply
 * per-route with `@UseGuards(JwtAuthGuard)` — not global, since most of
 * the API has anonymous-allowed routes (see API.md per-endpoint Auth
 * column). */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
