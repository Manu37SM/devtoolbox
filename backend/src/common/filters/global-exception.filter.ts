import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import type { ApiErrorBody } from "@devtoolbox/shared";

/**
 * Translates any thrown error into the standard error envelope documented
 * in API.md §1. Never leaks internal error details to the client for
 * unhandled (500) errors.
 *
 * Also the single place unhandled (5xx) errors get reported to Sentry
 * (AUDIT_REPORT.md §24) — 4xx `HttpException`s (validation errors, 403s,
 * 404s, rate limits) are expected control flow, not bugs, and are never
 * sent; sending them would both be noise and risk `exception.message`
 * echoing back user-supplied input (e.g. a Zod validation message quoting
 * part of an invalid payload) into an error-tracking tool, which CLAUDE.md
 * rule 8 explicitly rules out. Only the exception's name/message/stack plus
 * route method+path+status+requestId are attached — never `req.body`,
 * `req.query`, or headers/cookies, exactly the CLAUDE.md rule 8 boundary.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = randomUUID();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.message : "Something went wrong. Please try again.";

    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTags({ method: request?.method, path: request?.route?.path ?? request?.path, status, requestId });
        scope.setFingerprint([String(status), request?.route?.path ?? request?.path ?? "unknown"]);
        Sentry.captureException(exception instanceof Error ? exception : new Error(String(exception)));
      });
    }

    const body: ApiErrorBody = {
      error: {
        code: mapStatusToCode(status),
        message,
        requestId,
      },
    };

    response.status(status).json(body);
  }
}

function mapStatusToCode(status: number): ApiErrorBody["error"]["code"] {
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 429:
      return "RATE_LIMITED";
    default:
      return "INTERNAL_ERROR";
  }
}
