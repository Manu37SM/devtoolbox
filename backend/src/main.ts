import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

/**
 * Backend entry point. See ARCHITECTURE.md §8.3 for module boundaries and
 * DEVELOPMENT_GUIDE.md §3 for the full folder structure.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.use(cookieParser());
  // Explicit single-origin allowlist, not `origin: true` — reflecting the
  // request origin with credentials:true would let any site read
  // cookie-authenticated responses (see ARCHITECTURE.md §9 CSRF note; the
  // refresh-token cookie is sameSite=strict as defense-in-depth on top of
  // this, not instead of it).
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  });
  app.setGlobalPrefix("v1");
  app.useGlobalFilters(new GlobalExceptionFilter());

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`DevToolbox API listening on :${port}`);
}

bootstrap();
