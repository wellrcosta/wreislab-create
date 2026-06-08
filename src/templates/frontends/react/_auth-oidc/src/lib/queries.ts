import { useQuery } from '@tanstack/react-query';
import { HTTPError } from 'ky';
import { useAuth } from '@/auth/useAuth';
import { api, type AdminResponse, type ProfileResponse, type PublicResponse } from './api';

export function usePublicQuery() {
  return useQuery({
    queryKey: ['public'],
    queryFn: () => api.get('public').json<PublicResponse>(),
    staleTime: 60_000,
  });
}

export function useProfileQuery() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('auth/me').json<ProfileResponse>(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useAdminQuery() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin'],
    queryFn: async () => {
      try {
        return await api.get('admin').json<AdminResponse>();
      } catch (err) {
        if (err instanceof HTTPError && err.response.status === 403) {
          return null;
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
    retry: false,
  });
}
