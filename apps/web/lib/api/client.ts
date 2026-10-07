import type { ProblemDetails } from '@starter/contracts';

/** An error response from the API, carrying its RFC 7807 problem document. */
export class ApiError extends Error {
  constructor(public readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
  }

  get status(): number {
    return this.problem.status;
  }

  /** Stable machine-readable code, e.g. `ADMIN_ALREADY_EXISTS`. */
  get type(): string {
    return this.problem.type;
  }
}

export interface ApiClientOptions {
  /** Prefix for every request. Same-origin by default (see next.config.mjs). */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Called once when the session cannot be recovered (refresh failed). */
  onUnauthenticated?: () => void;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

const REFRESH_PATH = '/auth/refresh';

/** Endpoints where a 401 is the answer, not a reason to refresh and retry. */
const NO_REFRESH_PATHS = new Set([REFRESH_PATH, '/auth/google']);

async function toProblem(response: Response): Promise<ProblemDetails> {
  try {
    const body = (await response.json()) as Partial<ProblemDetails>;
    if (typeof body.type === 'string' && typeof body.title === 'string') {
      return { detail: null, instance: '', status: response.status, ...body } as ProblemDetails;
    }
  } catch {
    // Not JSON (e.g. a proxy error page) — fall through to a generic problem.
  }

  return {
    type: 'HTTP_ERROR',
    title: response.statusText || 'Request failed',
    status: response.status,
    detail: null,
    instance: '',
  };
}

/**
 * Small fetch wrapper for the API.
 *
 * Access tokens are short-lived httpOnly cookies, so a 401 usually just means
 * "refresh first". The client does that transparently and retries once.
 *
 * Refresh tokens are single-use and the API treats a replayed one as theft
 * (it revokes the whole session). Several requests failing at the same moment
 * must therefore share ONE refresh call — never fire one each.
 */
export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = options.baseUrl ?? '/api';
  const doFetch = options.fetch ?? fetch;

  let refreshing: Promise<boolean> | null = null;

  const send = (method: string, path: string, body?: unknown) =>
    doFetch(`${baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const refresh = (): Promise<boolean> => {
    refreshing ??= send('POST', REFRESH_PATH)
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });

    return refreshing;
  };

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let response = await send(method, path, body);

    if (response.status === 401 && !NO_REFRESH_PATHS.has(path)) {
      if (await refresh()) {
        response = await send(method, path, body);
      } else {
        options.onUnauthenticated?.();
      }
    }

    if (!response.ok) {
      throw new ApiError(await toProblem(response));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
  };
}