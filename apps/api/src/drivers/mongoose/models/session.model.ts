import { InferSchemaType, Schema, model } from 'mongoose';

const Session = new Schema({
  _id: { type: String, required: true },
  user: {
    type: String,
    ref: 'Admin',
    required: true,
  },
  agent: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  lastActivity: {
    type: Date,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  // sha256 of the current refresh-token jti — rotated on each refresh so a
  // replayed (already-rotated) refresh token is detected and revokes the session.
  refreshTokenId: {
    type: String,
    required: false,
  },
});

Session.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
Session.index({ user: 1 });

export type SessionModelType = InferSchemaType<typeof Session>;

export const SessionModel = model('Session', Session);
