export interface OAuthUserInfo {
  providerId: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export abstract class GoogleAuthProviderPort {
  abstract verifyIdToken(idToken: string): Promise<OAuthUserInfo>;
}
