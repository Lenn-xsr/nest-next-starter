import { AdminUseCase } from './admin';
import { SessionUseCase } from '../session';
import { ApiError } from 'src/domain/errors';
import {
  InMemoryAdminRepository,
  InMemorySessionRepository,
  silentLogger,
} from 'src/testing/fakes';

async function errorOf(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject');
}

describe('AdminUseCase', () => {
  const envBackup = { ...process.env };
  let admins: InMemoryAdminRepository;
  let sessions: InMemorySessionRepository;
  let sessionUseCase: SessionUseCase;
  let useCase: AdminUseCase;

  beforeEach(() => {
    process.env.ALLOWED_GOOGLE_DOMAINS = 'example.com, example.org';
    admins = new InMemoryAdminRepository();
    sessions = new InMemorySessionRepository();
    sessionUseCase = new SessionUseCase(sessions, silentLogger);
    useCase = new AdminUseCase(admins, sessions);

    admins.seed({ id: 'jane', email: 'jane@example.com' });
    admins.seed({ id: 'john', email: 'john@example.com' });
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  const openSession = (userId: string) =>
    sessionUseCase.createSession({
      userId,
      agent: 'jest',
      location: 'unknown',
      ipAddress: '::1',
    });

  describe('invite', () => {
    it('creates an active admin with a normalized email', async () => {
      const admin = await useCase.create({
        email: '  New.Person@Example.ORG ',
        name: 'New Person',
      });

      expect(admin).toMatchObject({
        email: 'new.person@example.org',
        name: 'New Person',
        active: true,
      });
      expect(await admins.getByEmail('new.person@example.org')).not.toBeNull();
    });

    it('refuses an email outside the allowed domains', async () => {
      const error = await errorOf(useCase.create({ email: 'x@evil.test' }));

      expect(error.type).toBe('ADMIN_DOMAIN_NOT_ALLOWED');
    });

    it('refuses a duplicate, regardless of letter case', async () => {
      const error = await errorOf(
        useCase.create({ email: 'JANE@example.com' }),
      );

      expect(error.type).toBe('ADMIN_ALREADY_EXISTS');
      expect(error.getStatus()).toBe(409);
    });
  });

  describe('deactivation', () => {
    it('is a kill switch: every session of the target is revoked', async () => {
      await openSession('john');
      await openSession('john');
      const janeSession = await openSession('jane');

      const updated = await useCase.setActive('john', false, 'jane');

      expect(updated.active).toBe(false);
      expect(await sessions.getSessionsByUserId('john')).toHaveLength(0);
      expect(await sessions.getSession(janeSession.id)).not.toBeNull();
    });

    it('cannot be applied to yourself', async () => {
      const error = await errorOf(useCase.setActive('jane', false, 'jane'));

      expect(error.type).toBe('ADMIN_SELF_DEACTIVATION');
    });

    it('never removes the last active admin', async () => {
      admins.seed({ id: 'idle', email: 'idle@example.com', active: false });
      await useCase.setActive('john', false, 'jane');

      // jane is now the only active admin; a third party cannot lock everyone out.
      const error = await errorOf(useCase.setActive('jane', false, 'idle'));

      expect(error.type).toBe('ADMIN_LAST_ACTIVE');
      expect((await admins.getById('jane'))?.active).toBe(true);
    });

    it('can be reversed', async () => {
      await useCase.setActive('john', false, 'jane');

      expect((await useCase.setActive('john', true, 'jane')).active).toBe(true);
    });

    it('reports an unknown admin', async () => {
      const error = await errorOf(useCase.setActive('ghost', false, 'jane'));

      expect(error.type).toBe('ADMIN_NOT_FOUND');
    });
  });
});

describe('SessionUseCase', () => {
  let sessions: InMemorySessionRepository;
  let useCase: SessionUseCase;

  beforeEach(() => {
    sessions = new InMemorySessionRepository();
    useCase = new SessionUseCase(sessions, silentLogger);
  });

  const open = (userId: string) =>
    useCase.createSession({
      userId,
      agent: 'jest',
      location: 'unknown',
      ipAddress: '::1',
    });

  it('creates sessions that expire with the refresh window (14 days)', async () => {
    const before = Date.now();

    const session = await open('jane');

    const lifetimeDays =
      (session.expiresAt.getTime() - before) / (24 * 60 * 60 * 1000);
    expect(lifetimeDays).toBeCloseTo(14, 1);
    expect(session.isActive()).toBe(true);
  });

  it('lets a user revoke their own session', async () => {
    const session = await open('jane');

    await useCase.revokeOwnSession('jane', session.id);

    expect(await sessions.getSession(session.id)).toBeNull();
  });

  it("reports someone else's session as not found and leaves it alone", async () => {
    const session = await open('john');

    await expect(
      useCase.revokeOwnSession('jane', session.id),
    ).rejects.toMatchObject({ type: 'SESSION_NOT_FOUND' });
    expect(await sessions.getSession(session.id)).not.toBeNull();
  });

  it('treats logout of an already-gone session as a no-op', async () => {
    await expect(useCase.logout('jane', 'missing')).resolves.toBeUndefined();
  });

  it("never logs out another user's session", async () => {
    const session = await open('john');

    await useCase.logout('jane', session.id);

    expect(await sessions.getSession(session.id)).not.toBeNull();
  });
});
