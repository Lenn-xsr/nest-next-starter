import type {
  AdminResponse,
  MessageResponse,
  SessionResponse,
} from '@starter/contracts';
import { createApiClient } from './client';
import { LOGIN_PATH } from '@/lib/auth/routes';

export { ApiError } from './client';

const client = createApiClient({
  onUnauthenticated: () => {
    if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
      window.location.assign(LOGIN_PATH);
    }
  },
});

export const authApi = {
  loginWithGoogle: (idToken: string) =>
    client.post<MessageResponse>('/auth/google', { idToken }),
  logout: () => client.post<MessageResponse>('/auth/logout'),
  me: () => client.get<AdminResponse>('/auth/session'),
  updateMe: (data: { name: string }) =>
    client.patch<AdminResponse>('/auth/me', data),
  sessions: () => client.get<SessionResponse[]>('/auth/sessions'),
  revokeSession: (id: string) =>
    client.delete<MessageResponse>(`/auth/sessions/${id}`),
};

export const teamApi = {
  list: () => client.get<AdminResponse[]>('/admins'),
  invite: (data: { email: string; name?: string }) =>
    client.post<AdminResponse>('/admins', data),
  setActive: (id: string, active: boolean) =>
    client.patch<AdminResponse>(`/admins/${id}/active`, { active }),
};