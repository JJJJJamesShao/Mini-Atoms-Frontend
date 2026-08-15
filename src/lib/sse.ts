import { API_BASE, TOKEN_STORAGE_KEY } from '@/config';
import type { PipelineRequest, SseEvent } from '@/types/pipeline';

/**
 * Pipeline SSE 流解析器。
 * 逐行解析 `data: {...}` 帧，yield 出类型化事件；
 * 由调用方（usePipeline）负责看门狗与中断。
 */
export async function* streamPipeline(
  body: PipelineRequest,
  signal: AbortSignal,
): AsyncGenerator<SseEvent, void, unknown> {
  const res = await fetch(`${API_BASE}/api/pipeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem(TOKEN_STORAGE_KEY) || ''}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const err = await res
      .json()
      .catch(() => ({ message: 'Pipeline 启动失败' }));
    throw new Error((err as { message?: string }).message || 'Pipeline 启动失败');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const chunk of lines) {
        const line = chunk.trim();
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6);
        if (json === '[DONE]') return;
        try {
          yield JSON.parse(json) as SseEvent;
        } catch {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
