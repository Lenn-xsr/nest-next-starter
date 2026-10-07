import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient } from './client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const unauthorized = () =>
  json(401, { type: 'AUTH_FAILED', title: 'Authentication failed', status: 401 });

/**
 * A scripted API: each path answers with the next response in its queue (the
 * last one repeats). Records every call so tests can assert on the traffic.
 */
function fakeApi(script: Record<string, Array<() => Response>>) {
  const calls: string[] = [];
  const queues = new Map(Object.entries(script).map(([k, v]) => [k, [...v]]));

  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method} ${String(input)}`;
    calls.push(key);
    const queue = queues.get(key);
    if (!queue) throw new Error(`Unexpected request: ${key}`);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    return Promise.resolve(next());
  });

  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}

describe('createApiClient', () => {
  it('sends JSON with cookies and returns the parsed body', async () => {
    const { fetch } = fakeApi({
      'POST /api/admins': [() => json(201, { id: 'a1' })],
    });
    const client = createApiClient({ fetch });

    const result = await client.post<{ id: string }>('/admins', {
      email: 'jane@example.com',
    });

    expect(result).toEqual({ id: 'a1' });
    expect(fetch).toHaveBeenCalledWith('/api/admins', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"jane@example.com"}',
    });
  });

  it('turns a problem document into an ApiError with its code and detail', async () => {
    const { fetch } = fakeApi({
      'POST /api/admins': [
        () =>
          json(409, {
            type: 'ADMIN_ALREADY_EXISTS',
            title: 'An admin with this email already exists',
            status: 409,
            detail: null,
            instance: '/api/admins',
          }),
      ],
    });
    const client = createApiClient({ fetch });

    const error = await client.post('/admins', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      type: 'ADMIN_ALREADY_EXISTS',
      status: 409,
      message: 'An admin with this email already exists',
    });
  });

  it('still produces an ApiError when the response is not JSON', async () => {
    const { fetch } = fakeApi({
      'GET /api/admins': [
        () => new Response('<html>Bad gateway</html>', { status: 502 }),
      ],
    });

    const error = await createApiClient({ fetch })
      .get('/admins')
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ type: 'HTTP_ERROR', status: 502 });
  });

  describe('expired access token', () => {
    it('refreshes once and replays the original request', async () => {
      const { fetch, calls } = fakeApi({
        'GET /api/auth/session': [unauthorized, () => json(200, { id: 'jane' })],
        'POST /api/auth/refresh': [() => json(200, { message: 'ok' })],
      });
      const onUnauthenticated = vi.fn();
      const client = createApiClient({ fetch, onUnauthenticated });

      const me = await client.get<{ id: string }>('/auth/session');

      expect(me).toEqual({ id: 'jane' });
      expect(calls).toEqual([
        'GET /api/auth/session',
        'POST /api/auth/refresh',
        'GET /api/auth/session',
      ]);
      expect(onUnauthenticated).not.toHaveBeenCalled();
    });

    it('shares a single refresh between requests that fail together', async () => {
      // Refresh tokens are single-use: a second parallel refresh would look
      // like token theft to the API and revoke the session.
      const { fetch, calls } = fakeApi({
        'GET /api/auth/session': [unauthorized, () => json(200, { id: 'jane' })],
        'GET /api/admins': [unauthorized, () => json(200, [])],
        'GET /api/auth/sessions': [unauthorized, () => json(200, [])],
        'POST /api/auth/refresh': [() => json(200, { message: 'ok' })],
      });
      const client = createApiClient({ fetch });

      const results = await Promise.all([
        client.get('/auth/session'),
        client.get('/admins'),
        client.get('/auth/sessions'),
      ]);

      expect(results).toEqual([{ id: 'jane' }, [], []]);
      expect(calls.filter((c) => c === 'POST /api/auth/refresh')).toHaveLength(1);
    });

    it('starts a fresh refresh for a later, separate expiry', async () => {
      const { fetch, calls } = fakeApi({
        'GET /api/admins': [
          unauthorized,
          () => json(200, []),
          unauthorized,
          () => json(200, []),
        ],
        'POST /api/auth/refresh': [() => json(200, { message: 'ok' })],
      });
      const client = createApiClient({ fetch });

      await client.get('/admins');
      await client.get('/admins');

      expect(calls.filter((c) => c === 'POST /api/auth/refresh')).toHaveLength(2);
    });

    it('signs the user out when the refresh is rejected', async () => {
      const { fetch, calls } = fakeApi({
        'GET /api/admins': [unauthorized],
        'POST /api/auth/refresh': [unauthorized],
      });
      const onUnauthenticated = vi.fn();
      const client = createApiClient({ fetch, onUnauthenticated });

      const error = await client.get('/admins').catch((e: unknown) => e);

      expect(error).toMatchObject({ status: 401 });
      expect(onUnauthenticated).toHaveBeenCalledTimes(1);
      // No replay after a failed refresh.
      expect(calls).toEqual(['GET /api/admins', 'POST /api/auth/refresh']);
    });

    it('does not loop when the replayed request is rejected again', async () => {
      const { fetch, calls } = fakeApi({
        'GET /api/admins': [unauthorized],
        'POST /api/auth/refresh': [() => json(200, { message: 'ok' })],
      });

      const error = await createApiClient({ fetch })
        .get('/admins')
        .catch((e: unknown) => e);

      expect(error).toMatchObject({ status: 401 });
      expect(calls).toHaveLength(3);
    });

    it('treats a network failure during refresh as a failed refresh', async () => {
      const onUnauthenticated = vi.fn();
      const fetch = vi.fn((input: RequestInfo | URL) =>
        String(input).endsWith('/auth/refresh')
          ? Promise.reject(new TypeError('network down'))
          : Promise.resolve(unauthorized()),
      ) as unknown as typeof globalThis.fetch;

      const error = await createApiClient({ fetch, onUnauthenticated })
        .get('/admins')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(onUnauthenticated).toHaveBeenCalledTimes(1);
    });
  });

  it('reports a failed sign-in as-is, without attempting a refresh', async () => {
    const { fetch, calls } = fakeApi({
      'POST /api/auth/google': [unauthorized],
    });
    const onUnauthenticated = vi.fn();

    const error = await createApiClient({ fetch, onUnauthenticated })
      .post('/auth/google', { idToken: 'bad' })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ type: 'AUTH_FAILED' });
    expect(calls).toEqual(['POST /api/auth/google']);
    expect(onUnauthenticated).not.toHaveBeenCalled();
  });
});
