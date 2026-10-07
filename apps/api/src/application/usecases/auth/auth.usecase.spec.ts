import { createHash } from 'crypto';
import { AuthUseCase } from './oauth.auth';
import { SessionUseCase } from '../session';
import { JWTTokenProviderAdapter } from 'src/drivers/jwt/token.provider.adapter';
import {
  RefreshTokenPayload,
  TokenPair,
} from 'src/application/ports/token.provider.port';
import { ApiError } from 'src/domain/errors';
import {
  FakeGoogleAuth,
  InMemoryAdminRepository,
  InMemorySessionRepository,
  silentLogger,
} from 'src/testing/fakes';

const SESSION_INFO = { agent: 'jest', location: 'unknown', ipAddress: '::1' };

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject');
}

describe('AuthUseCase', () => {
  const envBackup = { ...process.env };
  let admins: InMemoryAdminRepository;
  let sessions: InMemorySessionRepository;
  let google: FakeGoogleAuth;
  let tokens: JWTTokenProviderAdapter;
  let auth: AuthUseCase;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';
    process.env.ALLOWED_GOOGLE_DOMAINS = 'example.com';

    admins = new InMemoryAdminRepository();
    sessions = new InMemorySessionRepository();
    google = new FakeGoogleAuth();
    tokens = new JWTTokenProviderAdapter();
    auth = new AuthUseCase(
      admins,
      tokens,
      new SessionUseCase(sessions, silentLogger),
      sessions,
      google,
      silentLogger,
    );

    admins.seed({ id: 'admin-1', email: 'jane@example.com' });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  const login = (email = 'jane@example.com'): Promise<TokenPair> =>
    auth.loginWithGoogleAdmin(
      google.issue(`token-${email}`, email),
      SESSION_INFO,
    );

  describe('sign-in', () => {
    it('issues a token pair bound to a new server-side session', async () => {
      const pair = await login();

      const [session] = await sessions.getSessionsByUserId('admin-1');
      expect(session).toMatchObject({ agent: 'jest', ipAddress: '::1' });
      expect(auth.getSessionIdFromToken(pair.accessToken)).toBe(session.id);
      expect((await auth.getUserFromToken(pair.accessToken)).email).toBe(
        'jane@example.com',
      );
    });

    it('stores only a hash of the refresh token id', async () => {
      const pair = await login();

      const { jti } = tokens.decodeTokenPayload<RefreshTokenPayload>(
        pair.refreshToken,
      );
      const [session] = await sessions.getSessionsByUserId('admin-1');

      expect(session.refreshTokenId).not.toBe(jti);
      expect(session.refreshTokenId).toBe(
        createHash('sha256').update(jti!).digest('hex'),
      );
    });

    it('normalizes the email Google returns before matching the invite', async () => {
      const pair = await auth.loginWithGoogleAdmin(
        google.issue('token', '  Jane@Example.com '),
        SESSION_INFO,
      );

      expect(pair.accessToken).toBeDefined();
    });

    it('rejects a token Google does not vouch for', async () => {
      const error = await errorOf(
        auth.loginWithGoogleAdmin('forged', SESSION_INFO),
      );

      expect(error.type).toBe('AUTH_FAILED');
    });

    it('rejects an unverified email', async () => {
      const idToken = google.issue('token', 'jane@example.com', {
        emailVerified: false,
      });

      const error = await errorOf(
        auth.loginWithGoogleAdmin(idToken, SESSION_INFO),
      );

      expect(error.type).toBe('AUTH_FAILED');
    });

    it('rejects an email outside the allowed domains', async () => {
      admins.seed({ id: 'admin-2', email: 'mallory@evil.test' });

      expect((await errorOf(login('mallory@evil.test'))).type).toBe(
        'ADMIN_DOMAIN_NOT_ALLOWED',
      );
    });

    it('fails closed when no domain is configured', async () => {
      delete process.env.ALLOWED_GOOGLE_DOMAINS;

      expect((await errorOf(login())).type).toBe('ADMIN_DOMAIN_NOT_ALLOWED');
    });

    it('rejects an allowed-domain account that was never invited', async () => {
      expect((await errorOf(login('stranger@example.com'))).type).toBe(
        'ADMIN_USER_NOT_REGISTERED',
      );
    });

    it('rejects a deactivated admin', async () => {
      admins.seed({ id: 'admin-3', email: 'old@example.com', active: false });

      expect((await errorOf(login('old@example.com'))).type).toBe(
        'ADMIN_USER_INACTIVE',
      );
      expect(await sessions.getSessionsByUserId('admin-3')).toHaveLength(0);
    });
  });

  describe('access tokens', () => {
    it('stop working the moment their session is revoked', async () => {
      const pair = await login();
      const [session] = await sessions.getSessionsByUserId('admin-1');

      await sessions.deleteSession(session.id);

      await expect(auth.getUserFromToken(pair.accessToken)).rejects.toThrow(
        'Invalid or expired session',
      );
    });

    it('stop working when the admin is deactivated', async () => {
      const pair = await login();

      await admins.update('admin-1', { active: false });

      await expect(auth.getUserFromToken(pair.accessToken)).rejects.toThrow(
        'Admin inactive',
      );
    });

    it('cannot be replaced by a refresh token', async () => {
      const pair = await login();

      await expect(auth.getUserFromToken(pair.refreshToken)).rejects.toThrow(
        'Cannot use refresh token for authentication',
      );
    });
  });

  describe('refresh', () => {
    it('rotates: the new pair works and the session keeps its id', async () => {
      const first = await login();

      const second = await auth.refreshTokens(first.refreshToken);

      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(auth.getSessionIdFromToken(second.accessToken)).toBe(
        auth.getSessionIdFromToken(first.accessToken),
      );
      expect((await auth.getUserFromToken(second.accessToken)).id).toBe(
        'admin-1',
      );
    });

    it('treats a replayed refresh token as theft and kills the session', async () => {
      const first = await login();
      const second = await auth.refreshTokens(first.refreshToken);

      await expect(auth.refreshTokens(first.refreshToken)).rejects.toThrow(
        'Refresh token reuse detected',
      );

      // The legitimate holder is logged out too — the session is gone.
      expect(await sessions.getSessionsByUserId('admin-1')).toHaveLength(0);
      await expect(auth.refreshTokens(second.refreshToken)).rejects.toThrow();
      await expect(auth.getUserFromToken(second.accessToken)).rejects.toThrow();
    });

    it('lets exactly one of two concurrent refreshes win', async () => {
      const first = await login();

      const results = await Promise.allSettled([
        auth.refreshTokens(first.refreshToken),
        auth.refreshTokens(first.refreshToken),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    });

    it('refuses an access token presented as a refresh token', async () => {
      const pair = await login();

      await expect(
        auth.refreshTokens(pair.accessToken as never),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('refuses to refresh for a deactivated admin', async () => {
      const pair = await login();

      await admins.update('admin-1', { active: false });

      await expect(auth.refreshTokens(pair.refreshToken)).rejects.toThrow(
        'Admin inactive',
      );
    });
  });
});
