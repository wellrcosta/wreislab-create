import { useQuery } from '@tanstack/react-query';
import { api, type HelloResponse } from './api';

export function useHelloQuery() {
  return useQuery({
    queryKey: ['hello'],
    queryFn: () => api.get('hello').json<HelloResponse>(),
    staleTime: 60_000,
  });
}
