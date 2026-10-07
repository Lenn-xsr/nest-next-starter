import { Session } from 'src/domain/entities/session';
import { SessionModelType } from '../models';
import { createId } from '@starter/contracts';

export class SessionMapper {
  static toDomain(mongoSession: SessionModelType): Session {
    return new Session(
      createId(mongoSession._id),
      mongoSession.user,
      mongoSession.agent,
      mongoSession.location,
      mongoSession.ipAddress,
      mongoSession.lastActivity,
      mongoSession.expiresAt,
      mongoSession.refreshTokenId ?? null,
    );
  }
}
