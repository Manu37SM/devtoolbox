import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as Sentry from "@sentry/node";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

const MAX_REQUEST_BODY_SIZE = "5mb";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,

    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
      }
      return event;
    },
  });
}

async function bootstrap() {

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  app.useBodyParser("json", { limit: MAX_REQUEST_BODY_SIZE });
  app.useBodyParser("urlencoded", { limit: MAX_REQUEST_BODY_SIZE, extended: true });

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);

  console.log(`DevToolbox API listening on :${port}`);
}

bootstrap();
