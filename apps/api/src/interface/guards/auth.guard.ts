import {
  Injectable,
  CanActivate,
  ExecutionContext,
  createParamDecorator,
} from '@nestjs/common';
import { Request } from 'express';
import { stringToToken } from 'src/application/ports/token.provider.port';
import { AuthUseCase } from 'src/application/usecases/auth';
import { Admin } from 'src/domain/entities/admin';
import { SessionUseCase } from 'src/application/usecases/session';
import { ApiError, ErrorTypes } from 'src/domain/errors';
import { ACCESS_COOKIE, readCookie } from '../http/cookies';

interface AuthenticatedRequest extends Request {
  user?: Admin;
  sessionId?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authUseCase: AuthUseCase,
    private readonly sessionUseCase: SessionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Token comes from the httpOnly cookie (browser) with a Bearer-header
    // fallback for Swagger / server-to-server scripts.
    const cookieToken = readCookie(request, ACCESS_COOKIE);
    const headerToken = request.headers.authorization
      ?.replace(/^Bearer\s+/i, '')
      .trim();
    const token = cookieToken || headerToken;

    if (!token) {
      throw new ApiError(ErrorTypes.AUTH_TOKEN_MISSING);
    }

    try {
      const accessToken = stringToToken(token);

      request.user = await this.authUseCase.getUserFromToken(accessToken);
      request.sessionId = this.authUseCase.getSessionIdFromToken(accessToken);

      await this.sessionUseCase.updateSessionActivity(request.sessionId);

      return true;
    } catch {
      // Do not forward the underlying error message to the client — it can
      // leak token internals. Surface a generic authentication failure.
      throw new ApiError(ErrorTypes.AUTH_FAILED);
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_, context: ExecutionContext): Admin => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new ApiError(ErrorTypes.AUTH_UNAUTHENTICATED);
    }

    return request.user;
  },
);

/** Id of the session the current request was authenticated with. */
export const CurrentSessionId = createParamDecorator(
  (_, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.sessionId) {
      throw new ApiError(ErrorTypes.AUTH_UNAUTHENTICATED);
    }

    return request.sessionId;
  },
);
