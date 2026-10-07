import { Injectable } from '@nestjs/common';
import {
  Token,
  TokenProviderPort,
  TokenPair,
  RefreshToken,
  RefreshTokenPayload,
} from 'src/application/ports/token.provider.port';
import { GoogleAuthProviderPort } from 'src/application/ports/oauth.provider.port';
import { Admin } from 'src/domain/entities/admin';
import { AdminRepositoryPort } from 'src/application/ports/admin.repository.port';
import { SessionRepositoryPort } from 'src/application/ports/session.repository.port';
import { LoggerProviderPort } from '@starter/contracts';
import { SessionUseCase, SessionInfoDto } from '../session';
import {
  allowedGoogleDomains,
  isAllowedGoogleDomain,
} from 'src/application/utils';
import { ApiError, ErrorTypes } from 'src/domain/errors';
import { createHash, randomUUID } from 'crypto';

interface AuthPayload {
  sub: string;
  sid: string;
  type?: 'access' | 'refresh';
}

@Injectable()
export class AuthUseCase {
  constructor(
    private readonly adminRepository: AdminRepositoryPort,
    private readonly tokenProvider: TokenProviderPort,
    private readonly sessionUseCase: SessionUseCase,
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly googleAuthProvider: GoogleAuthProviderPort,
    private readonly logger: LoggerProviderPort,
  ) {}

  private async validateAdminFromToken(decoded: AuthPayload) {
    const admin = await this.adminRepository.getById(decoded.sub);

    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.isActive()) {
      throw new Error('Admin inactive');
    }

    const session = await this.sessionUseCase.getSession(decoded.sid);
    if (!session || session.userId !== decoded.sub || !session.isActive()) {
      throw new Error('Invalid or expired session');
    }

    return admin;
  }

  getSessionIdFromToken(token: Token): string {
    const decoded = this.tokenProvider.decodeTokenPayload<AuthPayload>(token);
    return decoded.sid;
  }

  /** Update the current admin's editable profile fields (name only). */
  async updateProfile(
    adminId: string,
    data: { name?: string },
  ): Promise<Admin> {
    return this.adminRepository.update(adminId, { name: data.name });
  }

  async getUserFromToken(token: Token): Promise<Admin> {
    const decoded = this.tokenProvider.decodeTokenPayload<AuthPayload>(token);

    if (decoded.type === 'refresh') {
      throw new Error('Cannot use refresh token for authentication');
    }

    return this.validateAdminFromToken(decoded);
  }

  private hashJti(jti: string): string {
    return createHash('sha256').update(jti).digest('hex');
  }

  /** Domain part of an email, for non-PII log context. */
  private emailDomain(email: string): string {
    return email.split('@')[1] ?? 'unknown';
  }

  /** Stable, non-reversible identifier for an email — safe to ship to logs. */
  private hashEmail(email: string): string {
    return createHash('sha256').update(email).digest('hex');
  }

  private createTokenPair(
    adminId: string,
    sessionId: string,
    refreshJti: string,
  ): TokenPair {
    const accessToken = this.tokenProvider.signAccessToken({
      sub: adminId,
      sid: sessionId,
    });

    const refreshToken = this.tokenProvider.signRefreshToken({
      sub: adminId,
      sid: sessionId,
      jti: refreshJti,
    });

    return { accessToken, refreshToken };
  }

  private async createSessionAndReturnTokens(
    adminId: string,
    sessionInfo: SessionInfoDto,
  ): Promise<TokenPair> {
    const refreshJti = randomUUID();
    const session = await this.sessionUseCase.createSession({
      ...sessionInfo,
      userId: adminId,
      refreshTokenId: this.hashJti(refreshJti),
    });

    return this.createTokenPair(adminId, session.id, refreshJti);
  }

  /**
   * Sign-in. Verifies the Google ID token, then enforces TWO gates:
   *  1. the email belongs to an allowed domain (ALLOWED_GOOGLE_DOMAINS);
   *  2. the admin ALREADY exists in the DB and is active (no self sign-up).
   * The first admin is created with scripts/create-admin.ts; the rest are
   * invited from the team page.
   */
  async loginWithGoogleAdmin(
    idToken: string,
    sessionInfo: SessionInfoDto,
  ): Promise<TokenPair> {
    let email: string;
    let emailVerified: boolean;
    try {
      const info = await this.googleAuthProvider.verifyIdToken(idToken);
      email = info.email.trim().toLowerCase();
      emailVerified = info.emailVerified;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        `Admin login failed — invalid Google token (${detail})`,
        {
          event: 'admin_auth_login_failed',
          reason: 'invalid_token',
        },
      );
      throw new ApiError(ErrorTypes.AUTH_FAILED, 'Invalid Google credentials');
    }

    if (!emailVerified) {
      this.logger.warn('Admin login rejected — email not verified', {
        event: 'admin_auth_email_unverified',
        domain: this.emailDomain(email),
        emailHash: this.hashEmail(email),
      });
      throw new ApiError(ErrorTypes.AUTH_FAILED, 'Email not verified');
    }

    const allowedDomains = allowedGoogleDomains();
    if (allowedDomains.length === 0) {
      this.logger.error(
        'ALLOWED_GOOGLE_DOMAINS is not configured — refusing all logins',
        { event: 'admin_auth_misconfigured' },
      );
      throw new ApiError(ErrorTypes.ADMIN_DOMAIN_NOT_ALLOWED);
    }

    if (!isAllowedGoogleDomain(email, allowedDomains)) {
      this.logger.warn(
        `Admin login rejected — domain not allowed (${this.emailDomain(email)})`,
        {
          event: 'admin_auth_domain_rejected',
          domain: this.emailDomain(email),
          emailHash: this.hashEmail(email),
        },
      );
      throw new ApiError(ErrorTypes.ADMIN_DOMAIN_NOT_ALLOWED);
    }

    const admin = await this.adminRepository.getByEmail(email);
    if (!admin) {
      this.logger.warn('Admin login rejected — not registered', {
        event: 'admin_auth_not_registered',
        domain: this.emailDomain(email),
        emailHash: this.hashEmail(email),
      });
      throw new ApiError(ErrorTypes.ADMIN_USER_NOT_REGISTERED);
    }

    if (!admin.active) {
      this.logger.warn(
        `Admin login rejected — inactive account (${admin.id})`,
        {
          event: 'admin_auth_inactive',
          adminId: admin.id,
        },
      );
      throw new ApiError(ErrorTypes.ADMIN_USER_INACTIVE);
    }

    this.logger.info(`Admin ${admin.id} logged in via Google`, {
      event: 'admin_auth_login',
      adminId: admin.id,
    });

    return this.createSessionAndReturnTokens(admin.id, sessionInfo);
  }

  async refreshTokens(refreshToken: RefreshToken): Promise<TokenPair> {
    if (!this.tokenProvider.isRefreshToken(refreshToken)) {
      this.logger.warn('Token refresh failed — Invalid refresh token', {
        event: 'auth_refresh_failed',
        error: 'Invalid refresh token',
      });
      throw new Error('Invalid refresh token');
    }

    const decoded =
      this.tokenProvider.decodeTokenPayload<RefreshTokenPayload>(refreshToken);

    const session = await this.sessionUseCase.getSession(decoded.sid);
    if (!session || !session.isActive()) {
      this.logger.warn('Token refresh failed — Session expired or invalid', {
        event: 'auth_refresh_failed',
        error: 'Session expired or invalid',
      });
      throw new Error('Session expired or invalid');
    }

    // Rotation/reuse detection: only the latest issued refresh jti is accepted.
    // A stale/replayed refresh token (already rotated) is treated as theft and
    // revokes the entire session.
    const presentedHash = decoded.jti ? this.hashJti(decoded.jti) : null;
    if (!presentedHash) {
      await this.sessionUseCase.revokeSession(session.id);
      this.logger.warn(
        'Token refresh failed — reuse detected, session revoked',
        {
          event: 'auth_refresh_reuse',
          sessionId: session.id,
          adminId: decoded.sub,
        },
      );
      throw new Error('Refresh token reuse detected');
    }

    const admin = await this.adminRepository.getById(decoded.sub);
    if (!admin) {
      throw new Error('Admin not found');
    }

    if (!admin.isActive()) {
      throw new Error('Admin inactive');
    }

    // Atomic compare-and-swap: rotate the stored jti only when it still matches
    // the presented one. A null result means it was already rotated (a
    // concurrency-safe reuse signal) → revoke the entire session.
    const newJti = randomUUID();
    const rotated = await this.sessionRepository.rotateRefreshTokenIfCurrent(
      session.id,
      presentedHash,
      this.hashJti(newJti),
    );
    if (!rotated) {
      await this.sessionUseCase.revokeSession(session.id);
      this.logger.warn(
        'Token refresh failed — reuse detected, session revoked',
        {
          event: 'auth_refresh_reuse',
          sessionId: session.id,
          adminId: decoded.sub,
        },
      );
      throw new Error('Refresh token reuse detected');
    }

    this.logger.info(`Tokens refreshed for admin ${admin.id}`, {
      event: 'auth_refresh',
      adminId: admin.id,
    });

    return this.createTokenPair(admin.id, session.id, newJti);
  }
}
