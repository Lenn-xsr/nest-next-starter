import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { HttpExceptionFilter } from './interface/filters/exception.filter';
import {
  allowedOrigins,
  originCheck,
} from './interface/http/origin-check.middleware';

/**
 * Everything HTTP-level that is not a Nest module: proxy trust, security
 * headers, CORS, the CSRF origin check, the route prefix, validation and the
 * error format. Shared by main.ts and the HTTP tests so both run the same app.
 */
export function setupApp(app: NestExpressApplication): void {
  // Number of trusted proxy hops in front of the app (e.g. a load balancer = 1).
  // The real client IP is read that many entries from the right of
  // X-Forwarded-For, ignoring spoofed left entries.
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.use(helmet());

  const origins = allowedOrigins();

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.use(originCheck(origins));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}
