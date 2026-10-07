'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, teamApi } from '.';

export const queryKeys = {
  me: ['me'] as const,
  sessions: ['sessions'] as const,
  team: ['team'] as const,
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: authApi.me });
}

export function useUpdateMe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (admin) => {
      queryClient.setQueryData(queryKeys.me, admin);
      void queryClient.invalidateQueries({ queryKey: queryKeys.team });
    },
  });
}

export function useSessions() {
  return useQuery({ queryKey: queryKeys.sessions, queryFn: authApi.sessions });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions }),
  });
}

export function useTeam() {
  return useQuery({ queryKey: queryKeys.team, queryFn: teamApi.list });
}

export function useInviteAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: teamApi.invite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  });
}

export function useSetAdminActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      teamApi.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.team }),
  });
}