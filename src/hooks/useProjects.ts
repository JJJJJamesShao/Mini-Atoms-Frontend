import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function useProjects() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.list,
    enabled: !!token,
  });
}

export function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['projects'] });
}
