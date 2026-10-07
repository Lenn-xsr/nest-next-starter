import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import * as controllers from '../../interface/controllers';
import { LoggerModule } from '@starter/logger';
import { AdminModule } from './admin.module';
import { AuthModule } from './auth.module';
import { SessionModule } from './session.module';
import { RequestIdMiddleware } from '../../interface/middleware/request-id.middleware';

@Module({
  imports: [LoggerModule, AdminModule, AuthModule, SessionModule],
  controllers: Object.values(controllers),
})
export class BaseModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
