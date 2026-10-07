export const LOGIN_PATH = '/login';
export const HOME_PATH = '/team';

/** Must match ACCESS_COOKIE in the API (interface/http/cookies.ts). */
export const ACCESS_COOKIE = 'starter-access-token';

/**
 * Where to send a visitor based only on whether the access cookie is present.
 * Presence is a UX hint, not authorization: the API validates the token on
 * every request, and the client refreshes or signs out when it is rejected.
 */
export function redirectFor(pathname: string, hasCookie: boolean): string | null {
  const onLogin = pathname === LOGIN_PATH;

  if (!hasCookie && !onLogin) return LOGIN_PATH;
  if (hasCookie && (onLogin || pathname === '/')) return HOME_PATH;

  return null;
}