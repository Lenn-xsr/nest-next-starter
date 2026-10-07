// Access token: 15 minutes (short-lived; the client silently refreshes).
export const ACCESS_TOKEN_EXPIRATION_SECONDS = 60 * 15;

// Refresh token: 14 days (rotating, single-use; also the idle-timeout window —
// how long a user stays logged in between visits). Drives both the refresh JWT
// `exp` and the auth cookies' maxAge (see interface/http/cookies.ts).
export const REFRESH_TOKEN_EXPIRATION_SECONDS = 60 * 60 * 24 * 14;
