import { authApi, getErrorMessage, pipelineApi, projectApi } from '@/lib/api';
import { toast } from '@/components/ui/toast';

/** API 封装 Hook：暴露各接口与统一的错误提示 */
export function useApi() {
  const toastError = (err: unknown, fallback = '请求失败') =>
    toast(getErrorMessage(err, fallback), { variant: 'destructive' });

  return { authApi, projectApi, pipelineApi, getErrorMessage, toastError };
}
