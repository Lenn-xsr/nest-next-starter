import { Module } from '@nestjs/common';
import { TokenProviderPort } from 'src/application/ports/token.provider.port';
import { GoogleAuthProviderPort } from 'src/application/ports/oauth.provider.port';
import { JWTTokenProviderAdapter } from '../jwt/token.provider.adapter';
import { GoogleAuthProviderAdapter } from '../oauth';
import { AdminModule } from './admin.module';
import { SessionModule } from './session.module';
import { AuthUseCase } from 'src/application/usecases/auth';
import { AuthGuard } from 'src/interface/guards/auth.guard';

@Module({
  imports: [AdminModule, SessionModule],
  providers: [
    {
      provide: TokenProviderPort,
      useClass: JWTTokenProviderAdapter,
    },
    {
      provide: GoogleAuthProviderPort,
      useClass: GoogleAuthProviderAdapter,
    },
    AuthUseCase,
    AuthGuard,
  ],
  exports: [AuthUseCase, AuthGuard, SessionModule],
})
export class AuthModule {}
