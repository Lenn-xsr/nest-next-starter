import { OAuth2Client } from 'google-auth-library';
import {
  GoogleAuthProviderPort,
  OAuthUserInfo,
} from 'src/application/ports/oauth.provider.port';
import { sanitizeString } from 'src/application/utils';

export class GoogleAuthProviderAdapter extends GoogleAuthProviderPort {
  private client: OAuth2Client;

  constructor() {
    super();
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async verifyIdToken(idToken: string): Promise<OAuthUserInfo> {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      throw new Error('Invalid Google ID token');
    }

    if (!payload.sub) {
      throw new Error('Google ID token missing subject');
    }

    if (!payload.email) {
      throw new Error('Google ID token missing email');
    }

    return {
      providerId: payload.sub,
      email: payload.email.trim(),
      name: sanitizeString(payload.name),
      emailVerified: payload.email_verified === true,
    };
  }
}
