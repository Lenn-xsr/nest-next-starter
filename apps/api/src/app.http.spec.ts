import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { AdminRepositoryPort } from './application/ports/admin.repository.port';
import { GoogleAuthProviderPort } from './application/ports/oauth.provider.port';
import { SessionRepositoryPort } from './application/ports/session.repository.port';
import {
  FakeGoogleAuth,
  InMemoryAdminRepository,
  InMemorySessionRepository,
} from './testing/fakes';

const ORIGIN = 'http://localhost:3000';

/** `Set-Cookie` lines of a response, as an array. */
function cookiesOf(response: request.Response): string[] {
  const header = response.headers['set-cookie'] as
    string[] | string | undefined;
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

const cookieNamed = (response: request.Response, name: string) =>
  cookiesOf(response).find((cookie) => cookie.startsWith(`${name}=`));

/**
 * Boots the real AppModule with the real HTTP setup (prefix, CORS, CSRF origin
 * check, validation, error filter, guards, JWT). Only the outside world is
 * replaced: MongoDB by in-memory repositories and Google by a fake verifier.
 */
describe('API over HTTP', () => {
  const envBackup = { ...process.env };
  let app: NestExpressApplication;
  let admins: InMemoryAdminRepository;
  let sessions: InMemorySessionRepository;
  let google: FakeGoogleAuth;

  beforeEach(async () => {
    Object.assign(process.env, {
      JWT_SECRET: 'test-secret-with-at-least-32-characters',
      ALLOWED_GOOGLE_DOMAINS: 'example.com',
      CORS_ORIGINS: ORIGIN,
    });

    admins = new InMemoryAdminRepository();
    sessions = new InMemorySessionRepository();
    google = new FakeGoogleAuth();
    admins.seed({ id: 'jane', email: 'jane@example.com' });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AdminRepositoryPort)
      .useValue(admins)
      .overrideProvider(SessionRepositoryPort)
      .useValue(sessions)
      .overrideProvider(GoogleAuthProviderPort)
      .useValue(google)
      .compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    process.env = { ...envBackup };
  });

  /** A browser-like client: keeps cookies between requests. */
  const browser = () => request.agent(app.getHttpServer());

  async function signIn(client = browser(), email = 'jane@example.com') {
    await client
      .post('/api/auth/google')
      .set('Origin', ORIGIN)
      .send({ idToken: google.issue(`id-token-${email}`, email) })
      .expect(200);
    return client;
  }

  describe('sign-in', () => {
    it('sets httpOnly cookies and never returns tokens in the body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({ idToken: google.issue('id-token', 'jane@example.com') })
        .expect(200);

      const access = cookieNamed(response, 'starter-access-token');
      const refresh = cookieNamed(response, 'starter-refresh-token');

      expect(response.body).toEqual({ message: 'Logged in successfully' });
      expect(access).toMatch(/HttpOnly/);
      expect(access).toMatch(/Path=\/;/);
      expect(access).toMatch(/SameSite=Lax/);
      // The refresh token is only ever sent to the refresh endpoint.
      expect(refresh).toMatch(/HttpOnly/);
      expect(refresh).toMatch(/Path=\/api\/auth\/refresh/);
    });

    it('answers 403 problem+json for an account that was not invited', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({ idToken: google.issue('id-token', 'stranger@example.com') })
        .expect(403);

      expect(response.headers['content-type']).toContain(
        'application/problem+json',
      );
      expect(response.body).toMatchObject({
        type: 'ADMIN_USER_NOT_REGISTERED',
        status: 403,
        instance: '/api/auth/google',
      });
      expect(cookiesOf(response)).toHaveLength(0);
    });

    it('validates the body', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({})
        .expect(400);
    });
  });

  describe('authenticated requests', () => {
    it('reject a request without credentials', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/session')
        .expect(401);

      expect(response.body).toMatchObject({ type: 'AUTH_TOKEN_MISSING' });
    });

    it('identify the admin from the cookie', async () => {
      const client = await signIn();

      const response = await client.get('/api/auth/session').expect(200);

      expect(response.body).toMatchObject({
        id: 'jane',
        email: 'jane@example.com',
        active: true,
      });
    });

    it('update the profile name', async () => {
      const client = await signIn();

      const response = await client
        .patch('/api/auth/me')
        .set('Origin', ORIGIN)
        .send({ name: 'Jane Doe' })
        .expect(200);

      expect(response.body).toMatchObject({ name: 'Jane Doe' });
    });
  });

  describe('sessions', () => {
    it('lists every device and marks the current one', async () => {
      const laptop = await signIn();
      await signIn(browser());

      const response = await laptop.get('/api/auth/sessions').expect(200);
      const list = response.body as { current: boolean }[];

      expect(list).toHaveLength(2);
      expect(list.filter((session) => session.current)).toHaveLength(1);
    });

    it('lets one device sign another one out', async () => {
      const laptop = await signIn();
      const phone = await signIn(browser());

      const response = await laptop.get('/api/auth/sessions').expect(200);
      const other = (response.body as { id: string; current: boolean }[]).find(
        (session) => !session.current,
      )!;

      await laptop
        .delete(`/api/auth/sessions/${other.id}`)
        .set('Origin', ORIGIN)
        .expect(200);

      await phone.get('/api/auth/session').expect(401);
      await laptop.get('/api/auth/session').expect(200);
    });

    it('answers 404 when revoking a session that is not yours', async () => {
      admins.seed({ id: 'john', email: 'john@example.com' });
      const jane = await signIn();
      await signIn(browser(), 'john@example.com');
      const [johnSession] = await sessions.getSessionsByUserId('john');

      await jane
        .delete(`/api/auth/sessions/${johnSession.id}`)
        .set('Origin', ORIGIN)
        .expect(404);

      expect(await sessions.getSession(johnSession.id)).not.toBeNull();
    });

    it('end on logout, and the cookies are cleared', async () => {
      const client = await signIn();

      const response = await client
        .post('/api/auth/logout')
        .set('Origin', ORIGIN)
        .expect(200);

      expect(cookieNamed(response, 'starter-access-token')).toMatch(
        /starter-access-token=;/,
      );
      expect(await sessions.getSessionsByUserId('jane')).toHaveLength(0);
      await client.get('/api/auth/session').expect(401);
    });
  });

  describe('token refresh', () => {
    it('rotates both cookies and keeps the browser signed in', async () => {
      const client = await signIn();

      const response = await client
        .post('/api/auth/refresh')
        .set('Origin', ORIGIN)
        .expect(200);

      expect(cookieNamed(response, 'starter-access-token')).toBeDefined();
      expect(cookieNamed(response, 'starter-refresh-token')).toBeDefined();
      await client.get('/api/auth/session').expect(200);
    });

    it('revokes the session and clears cookies when a refresh token is replayed', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/google')
        .send({ idToken: google.issue('id-token', 'jane@example.com') })
        .expect(200);
      const stolen = cookieNamed(login, 'starter-refresh-token')!.split(';')[0];
      const refresh = () =>
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Cookie', stolen);

      await refresh().expect(200);
      const replay = await refresh().expect(401);

      expect(replay.body).toMatchObject({ type: 'AUTH_REFRESH_FAILED' });
      expect(cookieNamed(replay, 'starter-refresh-token')).toMatch(
        /starter-refresh-token=;/,
      );
      expect(await sessions.getSessionsByUserId('jane')).toHaveLength(0);
    });

    it('answers 401 without a refresh token', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);
    });
  });

  describe('CSRF origin check', () => {
    it('blocks a state-changing request from a foreign origin, even with valid cookies', async () => {
      const client = await signIn();

      const response = await client
        .patch('/api/auth/me')
        .set('Origin', 'https://evil.example')
        .send({ name: 'Hacked' })
        .expect(403);

      expect(response.body).toMatchObject({ type: 'ORIGIN_NOT_ALLOWED' });
      expect((await admins.getById('jane'))?.name).toBeNull();
    });

    it('does not interfere with reads', async () => {
      const client = await signIn();

      await client
        .get('/api/auth/session')
        .set('Origin', 'https://evil.example')
        .expect(200);
    });
  });

  describe('team', () => {
    it('requires authentication', async () => {
      await request(app.getHttpServer()).get('/api/admins').expect(401);
    });

    it('invites, lists and deactivates admins', async () => {
      const client = await signIn();

      const invited = await client
        .post('/api/admins')
        .set('Origin', ORIGIN)
        .send({ email: 'john@example.com', name: 'John' })
        .expect(201);
      const { id } = invited.body as { id: string };

      const list = await client.get('/api/admins').expect(200);
      expect(
        (list.body as { email: string }[]).map((admin) => admin.email).sort(),
      ).toEqual(['jane@example.com', 'john@example.com']);

      const john = await signIn(browser(), 'john@example.com');
      await john.get('/api/auth/session').expect(200);

      await client
        .patch(`/api/admins/${id}/active`)
        .set('Origin', ORIGIN)
        .send({ active: false })
        .expect(200);

      // Deactivation takes effect immediately, not when the token expires.
      await john.get('/api/auth/session').expect(401);
    });

    it('answers 409 for a duplicate invite and 403 for a foreign domain', async () => {
      const client = await signIn();

      await client
        .post('/api/admins')
        .set('Origin', ORIGIN)
        .send({ email: 'jane@example.com' })
        .expect(409);
      await client
        .post('/api/admins')
        .set('Origin', ORIGIN)
        .send({ email: 'x@evil.test' })
        .expect(403);
    });

    it('refuses self-deactivation', async () => {
      const client = await signIn();

      const response = await client
        .patch('/api/admins/jane/active')
        .set('Origin', ORIGIN)
        .send({ active: false })
        .expect(400);

      expect(response.body).toMatchObject({ type: 'ADMIN_SELF_DEACTIVATION' });
    });
  });

  it('exposes a health check', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
  });
});
