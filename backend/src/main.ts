import { NestFactory } from "@nestjs/core";
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
  app.enableCors({
    origin: process.env.NEXT_PUBLIC_API_BASE_URL ? true : false,
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
