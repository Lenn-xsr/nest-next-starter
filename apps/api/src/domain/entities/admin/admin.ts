import { id } from '@starter/contracts';

/**
 * A team member who can sign in. Admins are invited, never self-registered.
 */
export class Admin {
  constructor(
    public readonly id: id,
    public readonly email: string,
    public readonly name: string | null,
    public readonly photo: string | null,
    public readonly active: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  isActive(): boolean {
    return this.active;
  }

  getDisplayName(): string {
    return this.name || this.email.split('@')[0];
  }
}
