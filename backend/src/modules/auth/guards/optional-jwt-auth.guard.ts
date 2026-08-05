import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/** Like JwtAuthGuard but never rejects the request for a missing/invalid
 * token — `req.user` is just left undefined. For routes with a mixed
 * anonymous/owner access model (e.g. GET a Snippet/Pipeline that's either
 * public or owned by the caller — API.md §6-7). */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = unknown>(_err: unknown, user: unknown): TUser {
    return (user ?? undefined) as TUser;
  }
}
