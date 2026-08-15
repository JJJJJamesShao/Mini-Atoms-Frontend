import { create } from 'zustand';
import { TOKEN_STORAGE_KEY } from '@/config';
import { authApi } from '@/lib/api';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  restore: () => Promise<void>; // 从 localStorage 恢复
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    set({ token, user, isLoading: false });
  },
  clearAuth: () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    set({ token: null, user: null, isLoading: false });
  },
  restore: async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      set({ isLoading: false });
      return;
    }
    try {
      // 有 token 时调用 /api/auth/me 校验并恢复用户信息
      const { user } = await authApi.me();
      set({ token, user, isLoading: false });
    } catch {
      // token 失效，清除登录态
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      set({ token: null, user: null, isLoading: false });
    }
  },
}));
