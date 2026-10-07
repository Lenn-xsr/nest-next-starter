import { SessionResponse } from '@starter/contracts';
import { Session } from 'src/domain/entities';

export class SessionMapper {
  static toHttpResponse(
    session: Session,
    currentSessionId: string,
  ): SessionResponse {
    return {
      id: session.id,
      agent: session.agent,
      location: session.location,
      ipAddress: session.ipAddress,
      lastActivity: session.lastActivity.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isActive: session.isActive(),
      current: session.id === currentSessionId,
    };
  }
}
