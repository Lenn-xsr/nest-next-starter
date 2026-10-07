import { sign, verify } from 'jsonwebtoken';
import {
  Token,
  TokenPayload,
  TokenProviderPort,
  AccessToken,
  RefreshToken,
  AccessTokenPayload,
  RefreshTokenPayload,
} from 'src/application/ports/token.provider.port';
import {
  ACCESS_TOKEN_EXPIRATION_SECONDS,
  REFRESH_TOKEN_EXPIRATION_SECONDS,
} from 'src/config/auth.config';

/**
 * HS256 JWT signing/verification. Every token shares one secret + algorithm; the
 * access and refresh variants differ only by their `type` discriminant and TTL,
 * so all the shared mechanics live in the private helpers below.
 */
export class JWTTokenProviderAdapter extends TokenProviderPort {
  private readonly algorithm = 'HS256' as const;
  /** Bind every token to this audience/issuer and enforce both on verify. */
  private readonly audience = 'starter-web' as const;
  private readonly issuer = 'starter-api' as const;

  private get secret(): string {
    return process.env.JWT_SECRET as string;
  }

  /** `exp` claim (seconds since epoch) `ttlSeconds` into the future. */
  private expiresIn(ttlSeconds: number): number {
    return Math.floor(Date.now() / 1000) + ttlSeconds;
  }

  /** The single place a token is actually signed. */
  private signPayload(payload: object): Token {
    return sign(payload, this.secret, {
      algorithm: this.algorithm,
      audience: this.audience,
      issuer: this.issuer,
    }) as Token;
  }

  sign(payload: Record<string, unknown>): Token {
    return this.signPayload(payload);
  }

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): AccessToken {
    return this.signPayload({
      ...payload,
      type: 'access',
      exp: this.expiresIn(ACCESS_TOKEN_EXPIRATION_SECONDS),
    }) as AccessToken;
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): RefreshToken {
    return this.signPayload({
      ...payload,
      type: 'refresh',
      exp: this.expiresIn(REFRESH_TOKEN_EXPIRATION_SECONDS),
    }) as RefreshToken;
  }

  verify<T>(token: string): T {
    return verify(token, this.secret, {
      algorithms: [this.algorithm],
      audience: this.audience,
      issuer: this.issuer,
    }) as T;
  }

  decodeTokenPayload<T extends TokenPayload>(token: string): T {
    const decoded = this.verify<T>(token);
    if (!decoded.sub) {
      throw new Error('Valid token with wrong payload');
    }
    return decoded;
  }

  isAccessToken(token: Token): boolean {
    return this.hasType(token, 'access');
  }

  isRefreshToken(token: Token): boolean {
    return this.hasType(token, 'refresh');
  }

  /** Verify the signature and match the `type` discriminant; false if invalid. */
  private hasType(token: Token, type: 'access' | 'refresh'): boolean {
    try {
      return this.verify<{ type?: string }>(token).type === type;
    } catch {
      return false;
    }
  }
}
