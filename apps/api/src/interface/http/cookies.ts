import type { Request, Response, CookieOptions } from 'express';

import { REFRESH_TOKEN_EXPIRATION_SECONDS } from 'src/config/auth.config';

export const ACCESS_COOKIE = 'starter-access-token';
export const REFRESH_COOKIE = 'starter-refresh-token';
const REFRESH_COOKIE_PATH = '/api/auth/refresh';

const isProd = (): boolean => process.env.APP_ENV === 'prod';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd(),
    // Strict in prod (same-origin) is the strongest CSRF posture; dev is
    // cross-origin same-site (localhost:3000 -> :4000) so Lax is required for
    // the cookie to ride along on XHR. CSRF is still covered in dev by the
    // Origin allowlist check (origin-check.middleware.ts).
    sameSite: isProd() ? 'strict' : 'lax',
  };
}

/** Read a single cookie from the raw Cookie header (no cookie-parser dep). */
export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  // The access cookie's lifetime spans the refresh window so the web app's
  // middleware (a presence-only gate) keeps seeing it; the JWT *inside* is short-lived
  // (15 min) and the API enforces real expiry while the client silently
  // refreshes. The refresh cookie is scoped to the refresh route only.
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_EXPIRATION_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: '/' });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
  });
}
