import { SSE_WATCHDOG_MS } from '@/config';
import { getErrorMessage, pipelineApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { streamPipeline } from '@/lib/sse';
import { usePipelineStore } from '@/stores/pipelineStore';
import type { PipelineRequest } from '@/types/pipeline';

/**
 * Pipeline SSE 运行器。
 *
 * 流的生命周期独立于组件挂载：AbortController、看门狗、停止标记都在模块级，
 * 页面跳转 / PipelineChat 卸载不会中断流。只有三种情况会结束流：
 * 1. 用户显式调用 stop()
 * 2. 流自然结束（done / error / aborted 事件，或服务器提前断流）
 * 3. 看门狗判定连接死亡（45s 无任何数据，含心跳）
 */

let abortController: AbortController | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;
let stoppedByUser = false;

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

function armWatchdog() {
  clearWatchdog();
  watchdogTimer = setTimeout(() => {
    // 45s 无任何数据（含心跳）→ 连接已死亡
    abortController?.abort();
    usePipelineStore.getState().setError('连接超时：45 秒未收到服务器数据');
  }, SSE_WATCHDOG_MS);
}

async function runPipeline(params: PipelineRequest): Promise<void> {
  if (abortController) return; // 已有运行中的任务，重复挂载/调用不会重启流
  abortController = new AbortController();
  stoppedByUser = false;
  usePipelineStore.getState().beginRun(params.input);
  armWatchdog();

  try {
    for await (const event of streamPipeline(params, abortController.signal)) {
      armWatchdog(); // 每条事件（含心跳）重置看门狗
      usePipelineStore.getState().handleEvent(event);

      if (
        event.type === 'project_created' ||
        event.type === 'project_updated'
      ) {
        // P0: 项目列表动态刷新
        void queryClient.invalidateQueries({ queryKey: ['projects'] });
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
      if (stoppedByUser) {
        usePipelineStore.getState().setIdle();
      }
    } else {
      usePipelineStore
        .getState()
        .setError(getErrorMessage(err, 'Pipeline 连接失败'));
    }
  } finally {
    clearWatchdog();
    abortController = null;
  }
}

async function stopPipeline(): Promise<void> {
  if (!abortController) return;
  stoppedByUser = true;
  usePipelineStore.getState().setStopping();
  abortController.abort();
  try {
    await pipelineApi.abort(); // P1: 通知后端停止 LLM 调用
  } catch {
    // 404 表示已自然结束，忽略
  }
}

/**
 * Pipeline Hook：暴露全局共享的运行态与控制函数。
 * 多处挂载（首页 / 项目页的 PipelineChat）读写同一份 pipelineStore 与同一个流。
 */
export function usePipeline() {
  const state = usePipelineStore((s) => s.state);
  return { state, start: runPipeline, stop: stopPipeline };
}
