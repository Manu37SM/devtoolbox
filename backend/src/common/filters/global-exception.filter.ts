import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";
import { randomUUID } from "node:crypto";
import type { ApiErrorBody } from "@devtoolbox/shared";

/**
 * Translates any thrown error into the standard error envelope documented
 * in API.md §1. Never leaks internal error details to the client for
 * unhandled (500) errors.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const requestId = randomUUID();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttp ? exception.message : "Something went wrong. Please try again.";

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
