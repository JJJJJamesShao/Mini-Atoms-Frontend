import { QueryClient } from '@tanstack/react-query';

// 全局单例：App Provider 与模块级 pipeline 运行器共用
export const queryClient = new QueryClient();
