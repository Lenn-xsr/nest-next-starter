import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import {
  ConnectMongoDB,
  DisconnectMongoDB,
} from './drivers/mongoose/connection';
import { INestApplication, Logger } from '@nestjs/common';
import {
  DotenvEnvLoaderAdapter,
  EnvLoaderPort,
  GoogleEnvLoaderAdapter,
} from '@starter/config';
import { setupApp } from './app.setup';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const loadEnv = async () => {
  const envLoader: EnvLoaderPort = new DotenvEnvLoaderAdapter();
  await envLoader.loadEnv();

  if (process.env.APP_ENV === 'prod') {
    const googleEnvLoader = new GoogleEnvLoaderAdapter(
      process.env.APP_ENV,
      process.env.APP_NAME as string,
    );
    await googleEnvLoader.loadEnv();
  }
};

const setupSwagger = (app: INestApplication, logger: Logger, port: number) => {
  // Docs are disabled in production; available only in non-prod (localhost).
  if (process.env.APP_ENV === 'prod') return;

  const config = new DocumentBuilder()
    .setTitle('Starter API')
    .setDescription('Authentication, sessions and team management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your access token',
        in: 'header',
      },
      'access-token',
    )
    .addTag('Auth', 'Sign-in, token refresh and sessions')
    .addTag('Admins', 'Team management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
};

const bootstrap = async () => {
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 4000;

  await loadEnv();

  // Fail closed: refuse to boot without a strong JWT secret (it signs every
  // session; a missing/weak secret enables token forgery).
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters (use a strong random secret).',
    );
  }

  await ConnectMongoDB();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'warn', 'error', 'fatal'],
  });

  setupApp(app);

  setupSwagger(app, logger, Number(port));

  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    await app.close();
    await DisconnectMongoDB();
    logger.log('Graceful shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen(port);

  logger.log(`API running on port ${port}`);
};

void bootstrap();
