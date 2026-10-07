import {
  SessionRepositoryPort,
  CreateSessionRepositoryDTO,
} from 'src/application/ports/session.repository.port';
import { Session } from 'src/domain/entities/session';
import { SessionModel } from '../models';
import { SessionMapper } from '../mappers';

export class MongooseSessionRepositoryAdapter implements SessionRepositoryPort {
  async createSession(session: CreateSessionRepositoryDTO): Promise<Session> {
    const result = await SessionModel.create(session);
    return SessionMapper.toDomain(result);
  }

  async updateSession(id: string, session: Partial<Session>): Promise<Session> {
    const result = await SessionModel.findByIdAndUpdate(id, session, {
      new: true,
    }).exec();
    if (!result) {
      throw new Error('Session not found');
    }
    return SessionMapper.toDomain(result);
  }

  async deleteSession(id: string): Promise<void> {
    await SessionModel.findByIdAndDelete(id).exec();
  }

  async getSession(id: string): Promise<Session | null> {
    const sessionData = await SessionModel.findById(id).exec();
    return sessionData ? SessionMapper.toDomain(sessionData) : null;
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    const sessions = await SessionModel.find({ user: userId }).exec();
    return sessions.map((session) => SessionMapper.toDomain(session));
  }

  async rotateRefreshTokenIfCurrent(
    sessionId: string,
    currentRefreshTokenId: string,
    newRefreshTokenId: string,
  ): Promise<Session | null> {
    const result = await SessionModel.findOneAndUpdate(
      { _id: sessionId, refreshTokenId: currentRefreshTokenId },
      { refreshTokenId: newRefreshTokenId, lastActivity: new Date() },
      { new: true },
    ).exec();
    return result ? SessionMapper.toDomain(result) : null;
  }

  async deleteExpiredSessions(): Promise<void> {
    await SessionModel.deleteMany({ expiresAt: { $lt: new Date() } }).exec();
  }
}
