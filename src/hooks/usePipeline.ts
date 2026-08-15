import { useCallback, useEffect, useRef } from 'react';
import { SSE_WATCHDOG_MS } from '@/config';
import { getErrorMessage, pipelineApi } from '@/lib/api';
import { streamPipeline } from '@/lib/sse';
import { useInvalidateProjects } from '@/hooks/useProjects';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { PipelineRequest } from '@/types/pipeline';

/**
 * Pipeline SSE 核心 Hook：
 * - 驱动 streamPipeline，把每条事件分发给 pipelineStore
 * - 45 秒无数据看门狗：判定连接死亡并置 error
 * - stop：中断本地流并通知后端 abort
 */
export function usePipeline() {
  const abortRef = useRef<AbortController | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedByUserRef = useRef(false);
  const invalidateProjects = useInvalidateProjects();

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const armWatchdog = useCallback(() => {
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      // 45s 无任何数据（含心跳）→ 连接已死亡
      abortRef.current?.abort();
      usePipelineStore.getState().setError('连接超时：45 秒未收到服务器数据');
    }, SSE_WATCHDOG_MS);
  }, [clearWatchdog]);

  // 卸载时清理
  useEffect(
    () => () => {
      clearWatchdog();
      abortRef.current?.abort();
    },
    [clearWatchdog],
  );

  const start = useCallback(
    async (params: PipelineRequest) => {
      if (abortRef.current) return; // 已有运行中的任务
      const store = usePipelineStore.getState();
      const abort = new AbortController();
      abortRef.current = abort;
      stoppedByUserRef.current = false;
      store.beginRun(params.input);
      armWatchdog();

      try {
        for await (const event of streamPipeline(params, abort.signal)) {
          armWatchdog(); // 每条事件（含心跳）重置看门狗
          usePipelineStore.getState().handleEvent(event);

          if (
            event.type === 'project_created' ||
            event.type === 'project_updated'
          ) {
            invalidateProjects(); // P0: 项目列表动态刷新
          }
          if (
            event.type === 'done' ||
            event.type === 'aborted' ||
            event.type === 'error'
          ) {
            break;
          }
        }
        // 流自然结束但仍处于 running（未收到 done/aborted/error）
        const s = usePipelineStore.getState();
        if (s.state === 'running' || s.state === 'stopping') {
          s.setError('连接中断：服务器提前结束了数据流');
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          // 用户主动停止 → 回 idle；看门狗触发 → error 已由看门狗设置
          if (stoppedByUserRef.current) {
            usePipelineStore.getState().setIdle();
          }
        } else {
          usePipelineStore
            .getState()
            .setError(getErrorMessage(err, 'Pipeline 连接失败'));
        }
      } finally {
        clearWatchdog();
        abortRef.current = null;
      }
    },
    [armWatchdog, clearWatchdog, invalidateProjects],
  );

  const stop = useCallback(async () => {
    if (!abortRef.current) return;
    stoppedByUserRef.current = true;
    usePipelineStore.getState().setStopping();
    abortRef.current.abort();
    try {
      await pipelineApi.abort(); // P1: 通知后端停止 LLM 调用
    } catch {
      // 404 表示已自然结束，忽略
    }
  }, []);

  const state = usePipelineStore((s) => s.state);

  return { state, start, stop };
}
