import { API_BASE, TOKEN_STORAGE_KEY } from '@/config';
import type {
  ApiError,
  AuthResponse,
  Project,
  ProjectWithVersions,
  User,
} from '@/types/api';

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      // 仅带 body 时声明 JSON：空 body 配 application/json 会被 Fastify 400 拒绝
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ error: 'unknown', message: '请求失败' }));
    throw err as ApiError;
  }

  return res.json() as Promise<T>;
}

/** 错误文案优先取后端 message 字段（中文），error 码用于分支逻辑 */
export function getErrorMessage(err: unknown, fallback = '请求失败'): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === 'object' &&
    'error' in err &&
    'message' in err
  );
}

// 具体接口
export const authApi = {
  register: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  me: () => apiFetch<{ user: User }>('/api/auth/me'),
};

export const projectApi = {
  list: () => apiFetch<{ projects: Project[] }>('/api/projects'),
  get: (id: string) => apiFetch<ProjectWithVersions>(`/api/projects/${id}`),
  // 首次生成前调用：秒级创建草稿项目（status=summarizing），标题由后端异步生成
  createDraft: (body: { input: string }) =>
    apiFetch<{ project: Project }>('/api/projects/draft', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    }),
  pin: (id: string, pinned: boolean) =>
    apiFetch<{ success: boolean }>(`/api/projects/${id}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ pinned }),
    }),
};

export const pipelineApi = {
  abort: () =>
    apiFetch<{ success: boolean }>('/api/pipeline/abort', { method: 'POST' }),
};
