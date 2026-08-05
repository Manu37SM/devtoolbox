import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "../strategies/jwt-access.strategy";

export type { AuthenticatedUser };

/** Pulls the `{ userId, email }` set by JwtAccessStrategy off the request.
 * Only valid on routes guarded by JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthenticatedUser;
});
