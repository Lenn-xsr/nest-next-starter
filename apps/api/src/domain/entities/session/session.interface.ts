export interface SessionInterface {
  id: string;
  userId: string;
  agent: string;
  location: string;
  ipAddress: string;
  lastActivity: Date;
  expiresAt: Date;
}
