import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerProviderPort } from '@starter/contracts';
import { Session } from 'src/domain/entities/session';
import { SessionRepositoryPort } from 'src/application/ports/session.repository.port';
import { ApiError, ErrorTypes } from 'src/domain/errors';
import { REFRESH_TOKEN_EXPIRATION_SECONDS } from 'src/config/auth.config';

export interface SessionInfoDto {
  agent: string;
  location: string;
  ipAddress: string;
}

export interface CreateSessionDto extends SessionInfoDto {
  userId: string;
  refreshTokenId?: string | null;
}

@Injectable()
export class SessionUseCase {
  constructor(
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly logger: LoggerProviderPort,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<Session> {
    const now = new Date();

    // A session lives exactly as long as its refresh token can: once the
    // refresh window passes without activity, the user must sign in again.
    const session = await this.sessionRepository.createSession({
      _id: randomUUID(),
      user: dto.userId,
      agent: dto.agent,
      location: dto.location,
      ipAddress: dto.ipAddress,
      lastActivity: now,
      expiresAt: new Date(
        now.getTime() + REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
      ),
      refreshTokenId: dto.refreshTokenId ?? null,
    });

    this.logger.info(`Session created for user ${dto.userId}`, {
      event: 'session_created',
      userId: dto.userId,
      sessionId: session.id,
    });

    return session;
  }

  getSession(id: string): Promise<Session | null> {
    return this.sessionRepository.getSession(id);
  }

  getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.getSessionsByUserId(userId);
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.sessionRepository.updateSession(sessionId, {
      lastActivity: new Date(),
    });
  }

  /**
   * Revoke one of the caller's own sessions. A session that belongs to someone
   * else is reported as not found, so ids cannot be probed.
   */
  async revokeOwnSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.getSession(sessionId);

    if (!session || session.userId !== userId) {
      throw new ApiError(ErrorTypes.SESSION_NOT_FOUND);
    }

    await this.sessionRepository.deleteSession(sessionId);

    this.logger.info(`Session ${sessionId} revoked by user ${userId}`, {
      event: 'session_revoked',
      userId,
      sessionId,
    });
  }

  /** Hard-revoke a session (no ownership check) — used on refresh-reuse. */
  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.deleteSession(sessionId);
  }

  /** Idempotent: logging out of an already-gone session is not an error. */
  async logout(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.getSession(sessionId);

    if (!session || session.userId !== userId) {
      return;
    }

    await this.sessionRepository.deleteSession(sessionId);

    this.logger.info(`User ${userId} logged out`, {
      event: 'session_logout',
      userId,
      sessionId,
    });
  }
}
