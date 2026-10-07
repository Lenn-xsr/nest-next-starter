import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  Headers,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import {
  AdminResponse,
  MessageResponse,
  SessionResponse,
} from '@starter/contracts';
import { AuthUseCase } from 'src/application/usecases/auth';
import { SessionUseCase } from 'src/application/usecases/session';
import {
  AdminGoogleLoginDto,
  RefreshTokenDto,
} from 'src/application/dtos/auth/login.dto';
import { UpdateMeDto } from 'src/application/dtos/auth/update-me.dto';
import {
  MessageResponseDto,
  ErrorResponseDto,
} from 'src/application/dtos/auth/response.dto';
import {
  SessionResponseDto,
  AdminResponseDto,
} from 'src/application/dtos/session/response.dto';
import { AuthGuard, CurrentSessionId, CurrentUser } from '../guards/auth.guard';
import { Admin } from 'src/domain/entities/admin';
import { stringToRefreshToken } from 'src/application/ports/token.provider.port';
import { SessionMapper } from '../mappers/session.mapper';
import { AdminMapper } from '../mappers/admin.mapper';
import { ApiError, ErrorTypes } from 'src/domain/errors';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  readCookie,
  setAuthCookies,
} from '../http/cookies';

// Auth endpoints are the most sensitive surface — cap brute-force / token replay.
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authUseCase: AuthUseCase,
    private readonly sessionUseCase: SessionUseCase,
  ) {}

  @Post('google')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary: 'Sign in with Google',
    description:
      'Authenticate with a Google ID token. Allowed only for allow-listed email domains and accounts that were already invited. Tokens are returned as httpOnly cookies (not in the body).',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  @ApiResponse({ status: 403, type: ErrorResponseDto })
  async loginWithGoogle(
    @Body() dto: AdminGoogleLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers('user-agent') userAgent?: string,
  ): Promise<MessageResponse> {
    // The client IP comes from the (trust-proxy-aware) Express request rather
    // than the spoofable x-forwarded-for header.
    const tokens = await this.authUseCase.loginWithGoogleAdmin(dto.idToken, {
      agent: userAgent || 'unknown',
      location: 'unknown',
      ipAddress: req.ip ?? 'unknown',
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { message: 'Logged in successfully' };
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({
    summary:
      'Refresh tokens (rotating). Refresh token read from httpOnly cookie.',
  })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async refreshTokens(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: RefreshTokenDto,
  ): Promise<MessageResponse> {
    const refreshToken = readCookie(req, REFRESH_COOKIE) ?? dto.refreshToken;

    if (!refreshToken) {
      throw new ApiError(
        ErrorTypes.AUTH_REFRESH_FAILED,
        'Missing refresh token',
      );
    }

    try {
      const tokens = await this.authUseCase.refreshTokens(
        stringToRefreshToken(refreshToken),
      );

      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      return { message: 'Tokens refreshed' };
    } catch (error) {
      // A failed refresh (expired/reused) must not leave stale cookies behind.
      clearAuthCookies(res);
      if (error instanceof ApiError) throw error;
      throw new ApiError(ErrorTypes.AUTH_REFRESH_FAILED);
    }
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout (invalidate current session)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async logout(
    @CurrentUser() admin: Admin,
    @CurrentSessionId() sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MessageResponse> {
    // Whatever happens server-side, the browser must end up without cookies.
    clearAuthCookies(res);
    await this.sessionUseCase.logout(admin.id, sessionId);
    return { message: 'Logged out successfully' };
  }

  @Get('session')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the currently authenticated admin' })
  @ApiResponse({ status: 200, type: AdminResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  getCurrentUser(@CurrentUser() admin: Admin): AdminResponse {
    return AdminMapper.toHttpResponse(admin);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the current admin profile (name)' })
  @ApiResponse({ status: 200, type: AdminResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async updateMe(
    @CurrentUser() admin: Admin,
    @Body() dto: UpdateMeDto,
  ): Promise<AdminResponse> {
    const updated = await this.authUseCase.updateProfile(admin.id, {
      name: dto.name,
    });
    return AdminMapper.toHttpResponse(updated);
  }

  @Get('sessions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List the active sessions of the current admin' })
  @ApiResponse({ status: 200, type: [SessionResponseDto] })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async getUserSessions(
    @CurrentUser() admin: Admin,
    @CurrentSessionId() currentSessionId: string,
  ): Promise<SessionResponse[]> {
    const sessions = await this.sessionUseCase.getUserSessions(admin.id);
    return sessions.map((session) =>
      SessionMapper.toHttpResponse(session, currentSessionId),
    );
  }

  @Delete('sessions/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke one of your sessions' })
  @ApiParam({ name: 'id', description: 'Session id to revoke' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 404, type: ErrorResponseDto })
  async deleteSession(
    @CurrentUser() admin: Admin,
    @Param('id') sessionId: string,
  ): Promise<MessageResponse> {
    await this.sessionUseCase.revokeOwnSession(admin.id, sessionId);
    return { message: 'Session revoked' };
  }
}
