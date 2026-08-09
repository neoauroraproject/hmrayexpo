import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { existsSync, mkdirSync } from "node:fs";
import { AppModule } from "./app.module";
import { AppConfigService } from "./common/config/app-config.service";
import { uploadRoot } from "./common/uploads/multer.options";

// Telegram ids and message ids are BigInt columns; without this every response
// carrying one would throw "Do not know how to serialize a BigInt".
(BigInt.prototype as unknown as { toJSON(): string }).toJSON = function toJSON(
  this: bigint,
): string {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: false,
  });
  const config = app.get(AppConfigService);
  const logger = new Logger("Bootstrap");

  // Caddy terminates TLS in production, so trust its forwarded headers.
  app.set("trust proxy", 1);

  // Docker's healthcheck hits /health while the rest of the API lives under
  // /api; rewriting here keeps a single handler behind both paths.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.url === "/health" || req.url.startsWith("/health?")) {
      req.url = `/api${req.url}`;
    }
    next();
  });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.enableCors({
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Bot-Secret"],
    credentials: true,
  });

  const uploads = uploadRoot();
  if (!existsSync(uploads)) {
    mkdirSync(uploads, { recursive: true });
  }
  app.useStaticAssets(uploads, { prefix: "/uploads/", index: false });

  app.enableShutdownHooks();

  await app.listen(config.port, "0.0.0.0");
  logger.log(`HMRAY API listening on http://localhost:${config.port}/api`);
  if (!config.botInternalSecret) {
    logger.warn("BOT_INTERNAL_SECRET is unset — every /api/bot route will reject requests.");
  }
}

void bootstrap();
