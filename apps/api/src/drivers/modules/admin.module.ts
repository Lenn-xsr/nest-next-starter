import { Module } from '@nestjs/common';
import { AdminRepositoryPort } from 'src/application/ports/admin.repository.port';
import { MongooseAdminRepositoryAdapter } from '../mongoose/adapters';
import { AdminUseCase } from 'src/application/usecases/admin';
import { SessionModule } from './session.module';

@Module({
  imports: [SessionModule],
  providers: [
    {
      provide: AdminRepositoryPort,
      useClass: MongooseAdminRepositoryAdapter,
    },
    AdminUseCase,
  ],
  exports: [AdminRepositoryPort, AdminUseCase],
})
export class AdminModule {}
