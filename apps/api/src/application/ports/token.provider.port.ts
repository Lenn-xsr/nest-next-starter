export interface TokenPayload {
  sub: unknown;
  exp?: number;
}

export interface AccessTokenPayload extends TokenPayload {
  sub: string;
  sid: string;
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
  /** Rotation id: only the latest jti hashed onto the session is accepted. */
  jti?: string;
}

export type Token = string & { __brand: 'Token' };
export type AccessToken = Token & { __tokenType: 'access' };
export type RefreshToken = Token & { __tokenType: 'refresh' };

export interface TokenPair {
  accessToken: AccessToken;
  refreshToken: RefreshToken;
}

export const stringToToken = (token: string): Token => token as Token;
export const stringToAccessToken = (token: string): AccessToken =>
  token as AccessToken;
export const stringToRefreshToken = (token: string): RefreshToken =>
  token as RefreshToken;

export abstract class TokenProviderPort {
  abstract sign(payload: Record<string, unknown>): Token;
  abstract signAccessToken(
    payload: Omit<AccessTokenPayload, 'type'>,
  ): AccessToken;
  abstract signRefreshToken(
    payload: Omit<RefreshTokenPayload, 'type'>,
  ): RefreshToken;
  abstract verify<T>(token: Token): T;
  abstract decodeTokenPayload<T extends TokenPayload>(token: Token): T;
  abstract isRefreshToken(token: Token): boolean;
  abstract isAccessToken(token: Token): boolean;
}
