import { useCallback } from 'react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      setAuth(res.token, res.user);
    },
    [setAuth],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.register({ email, password });
      setAuth(res.token, res.user);
    },
    [setAuth],
  );

  const logout = useCallback(() => clearAuth(), [clearAuth]);

  return { user, token, isLoading, login, register, logout };
}
