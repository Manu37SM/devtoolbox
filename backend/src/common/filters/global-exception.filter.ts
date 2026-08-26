import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import type { ApiErrorBody } from "@devtoolbox/shared";

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
