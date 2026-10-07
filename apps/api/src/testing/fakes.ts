import { LoggerProviderPort, createId } from '@starter/contracts';
import {
  AdminRepositoryPort,
  CreateAdminDTO,
  UpdateAdminDTO,
} from 'src/application/ports/admin.repository.port';
import {
  GoogleAuthProviderPort,
  OAuthUserInfo,
} from 'src/application/ports/oauth.provider.port';
import {
  CreateSessionRepositoryDTO,
  SessionRepositoryPort,
} from 'src/application/ports/session.repository.port';
import { Admin } from 'src/domain/entities/admin';
import { Session } from 'src/domain/entities/session';

export const silentLogger: LoggerProviderPort = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export class InMemoryAdminRepository implements AdminRepositoryPort {
  private readonly items = new Map<string, Admin>();

  seed(data: { id: string; email: string; active?: boolean }): Admin {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const admin = new Admin(
      createId(data.id),
      data.email,
      null,
      null,
      data.active ?? true,
      now,
      now,
    );
    this.items.set(admin.id, admin);
    return admin;
  }

  getById(id: string): Promise<Admin | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  getByEmail(email: string): Promise<Admin | null> {
    const match = [...this.items.values()].find(
      (admin) => admin.email === email.trim().toLowerCase(),
    );
    return Promise.resolve(match ?? null);
  }

  create(data: CreateAdminDTO): Promise<Admin> {
    const now = new Date();
    const admin = new Admin(
      createId(data.id),
      data.email,
      data.name,
      data.photo ?? null,
      true,
      now,
      now,
    );
    this.items.set(admin.id, admin);
    return Promise.resolve(admin);
  }

  update(id: string, data: UpdateAdminDTO): Promise<Admin> {
    const current = this.items.get(id);
    if (!current) {
      return Promise.reject(new Error('Admin not found'));
    }
    const updated = new Admin(
      current.id,
      current.email,
      data.name !== undefined ? data.name : current.name,
      data.photo !== undefined ? data.photo : current.photo,
      data.active ?? current.active,
      current.createdAt,
      new Date(),
    );
    this.items.set(id, updated);
    return Promise.resolve(updated);
  }

  list(): Promise<Admin[]> {
    return Promise.resolve([...this.items.values()]);
  }
}

export class InMemorySessionRepository implements SessionRepositoryPort {
  private readonly items = new Map<string, Session>();

  private put(session: Session): Session {
    this.items.set(session.id, session);
    return session;
  }

  private copy(session: Session, changes: Partial<Session>): Session {
    return new Session(
      session.id,
      session.userId,
      session.agent,
      session.location,
      session.ipAddress,
      changes.lastActivity ?? session.lastActivity,
      changes.expiresAt ?? session.expiresAt,
      changes.refreshTokenId !== undefined
        ? changes.refreshTokenId
        : session.refreshTokenId,
    );
  }

  createSession(data: CreateSessionRepositoryDTO): Promise<Session> {
    return Promise.resolve(
      this.put(
        new Session(
          createId(data._id),
          data.user,
          data.agent,
          data.location,
          data.ipAddress,
          data.lastActivity,
          data.expiresAt,
          data.refreshTokenId ?? null,
        ),
      ),
    );
  }

  updateSession(id: string, changes: Partial<Session>): Promise<Session> {
    const session = this.items.get(id);
    if (!session) {
      return Promise.reject(new Error('Session not found'));
    }
    return Promise.resolve(this.put(this.copy(session, changes)));
  }

  deleteSession(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }

  getSession(id: string): Promise<Session | null> {
    return Promise.resolve(this.items.get(id) ?? null);
  }

  getSessionsByUserId(userId: string): Promise<Session[]> {
    return Promise.resolve(
      [...this.items.values()].filter((session) => session.userId === userId),
    );
  }

  /** Compare-and-swap, atomic like the Mongo `findOneAndUpdate` it stands for. */
  rotateRefreshTokenIfCurrent(
    sessionId: string,
    currentRefreshTokenId: string,
    newRefreshTokenId: string,
  ): Promise<Session | null> {
    const session = this.items.get(sessionId);
    if (!session || session.refreshTokenId !== currentRefreshTokenId) {
      return Promise.resolve(null);
    }
    return Promise.resolve(
      this.put(
        this.copy(session, {
          refreshTokenId: newRefreshTokenId,
          lastActivity: new Date(),
        }),
      ),
    );
  }

  deleteExpiredSessions(): Promise<void> {
    for (const session of this.items.values()) {
      if (session.isExpired()) this.items.delete(session.id);
    }
    return Promise.resolve();
  }
}

/**
 * Stands in for Google: an "ID token" is valid when it was registered here.
 */
export class FakeGoogleAuth extends GoogleAuthProviderPort {
  private readonly tokens = new Map<string, OAuthUserInfo>();

  issue(
    idToken: string,
    email: string,
    overrides: Partial<OAuthUserInfo> = {},
  ): string {
    this.tokens.set(idToken, {
      providerId: `google-${email}`,
      email,
      name: null,
      emailVerified: true,
      ...overrides,
    });
    return idToken;
  }

  verifyIdToken(idToken: string): Promise<OAuthUserInfo> {
    const info = this.tokens.get(idToken);
    return info
      ? Promise.resolve(info)
      : Promise.reject(new Error('Invalid Google ID token'));
  }
}
