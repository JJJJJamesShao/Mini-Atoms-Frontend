import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

// 草稿项目（summarizing）标题由后端异步生成：2s 轮询列表直到全部 ready。
// 保险丝：超过 30s 仍在 summarizing 则停止轮询，避免后端异常时无限请求
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
let summarizingFirstSeenAt: number | null = null;

export function useProjects() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ['projects'],
    queryFn: projectApi.list,
    enabled: !!token,
    refetchInterval: (query) => {
      const projects = query.state.data?.projects ?? [];
      const hasSummarizing = projects.some((p) => p.status === 'summarizing');
      if (!hasSummarizing) {
        summarizingFirstSeenAt = null;
        return false;
      }
      summarizingFirstSeenAt ??= Date.now();
      return Date.now() - summarizingFirstSeenAt > POLL_TIMEOUT_MS
        ? false
        : POLL_INTERVAL_MS;
    },
  });
}

export function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['projects'] });
}
