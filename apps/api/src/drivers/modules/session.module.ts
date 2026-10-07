import { Module } from '@nestjs/common';
import { SessionRepositoryPort } from 'src/application/ports/session.repository.port';
import { MongooseSessionRepositoryAdapter } from '../mongoose/adapters';
import { SessionUseCase } from 'src/application/usecases/session';

@Module({
  providers: [
    {
      provide: SessionRepositoryPort,
      useClass: MongooseSessionRepositoryAdapter,
    },
    SessionUseCase,
  ],
  exports: [SessionRepositoryPort, SessionUseCase],
})
export class SessionModule {}
