import { id } from '@starter/contracts';

export class Session {
  constructor(
    public readonly id: id,
    public readonly userId: string,
    public readonly agent: string,
    public readonly location: string,
    public readonly ipAddress: string,
    public readonly lastActivity: Date,
    public readonly expiresAt: Date,
    /** sha256 of the currently-valid refresh-token jti (rotation/reuse check). */
    public readonly refreshTokenId: string | null = null,
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return !this.isExpired();
  }

  getTimeUntilExpiry(): number {
    return this.expiresAt.getTime() - new Date().getTime();
  }
}
