import { Session } from 'src/domain/entities/session';

export interface CreateSessionRepositoryDTO {
  _id: string;
  user: string;
  agent: string;
  location: string;
  ipAddress: string;
  lastActivity: Date;
  expiresAt: Date;
  refreshTokenId?: string | null;
}

export abstract class SessionRepositoryPort {
  abstract createSession(session: CreateSessionRepositoryDTO): Promise<Session>;
  abstract updateSession(
    id: string,
    session: Partial<Session>,
  ): Promise<Session>;
  abstract deleteSession(id: string): Promise<void>;
  abstract getSession(id: string): Promise<Session | null>;
  abstract getSessionsByUserId(userId: string): Promise<Session[]>;
  /**
   * Atomic compare-and-swap of the stored refresh-token id. Rotates only when
   * `currentRefreshTokenId` still matches; returns the updated session, or
   * `null` when no session matched (i.e. the presented token was already
   * rotated — treated as reuse by the caller).
   */
  abstract rotateRefreshTokenIfCurrent(
    sessionId: string,
    currentRefreshTokenId: string,
    newRefreshTokenId: string,
  ): Promise<Session | null>;
  abstract deleteExpiredSessions(): Promise<void>;
}
