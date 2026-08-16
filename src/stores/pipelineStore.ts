import { create } from 'zustand';
import type { ProcessLog, StageState, VersionFile } from '@/types/api';
import type { PipelineState, SseEvent } from '@/types/pipeline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface QualityResult {
  passed: boolean;
  score: number;
  checks: { name: string; passed: boolean }[];
}

interface PipelineStore {
  state: PipelineState;
  stages: StageState[];
  logs: ProcessLog[];
  messages: ChatMessage[];
  currentInput: string;
  result: { files: VersionFile[]; notes: string } | null;
  error: string | null;
  questions: string[] | null;
  quality: QualityResult | null;
  projectId: string | null;
  versionNo: number | null;

  /** 开始一次运行：重置运行态并记录用户输入 */
  beginRun: (input: string) => void;
  /** 由 usePipeline 驱动：处理一条 SSE 事件 */
  handleEvent: (event: SseEvent) => void;
  setError: (message: string) => void;
  setIdle: () => void;
  setStopping: () => void;
  reset: () => void;
}

let seq = 0;
let msgSeq = 0;
const nextSeq = () => ++seq;
const nextMessageId = () => `msg-${++msgSeq}`;

const initialRunState = {
  state: 'idle' as PipelineState,
  stages: [] as StageState[],
  logs: [] as ProcessLog[],
  currentInput: '',
  result: null,
  error: null,
  questions: null,
  quality: null,
  projectId: null,
  versionNo: null,
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  ...initialRunState,
  messages: [],

  beginRun: (input) =>
    set((s) => ({
      ...initialRunState,
      state: 'running',
      currentInput: input,
      messages: [
        ...s.messages,
        {
          id: nextMessageId(),
          role: 'user',
          content: input,
          timestamp: Date.now(),
        },
      ],
    })),

  handleEvent: (event) =>
    set((s) => {
      switch (event.type) {
        case 'start':
          // SOP 步骤初始化为 pending 阶段卡片
          return {
            stages: event.sop.steps.map((step) => ({
              stage: step,
              status: 'pending' as const,
            })),
          };

        case 'agent_event': {
          const p = event.payload;
          const logs: ProcessLog[] = [
            ...s.logs,
            {
              seq: nextSeq(),
              stage: p.agent,
              phase:
                p.type === 'agent:start'
                  ? 'start'
                  : p.type === 'agent:complete' || p.type === 'agent:error'
                    ? 'end'
                    : 'progress',
              detail: p.message ?? p.error,
              timestamp: p.timestamp,
            },
          ];

          // 按 agent 名匹配阶段并更新状态
          let stages = s.stages;
          const idx = s.stages.findIndex(
            (st) => st.stage === p.agent || st.stage.includes(p.agent),
          );
          if (idx >= 0) {
            stages = s.stages.map((st, i) => {
              if (i !== idx) return st;
              if (p.type === 'agent:start')
                return { ...st, status: 'active' as const };
              if (p.type === 'agent:progress' || p.type === 'agent:thinking')
                return { ...st, status: 'active' as const, detail: p.message };
              if (p.type === 'agent:complete')
                return { ...st, status: 'done' as const, detail: p.message };
              if (p.type === 'agent:error')
                return { ...st, status: 'failed' as const, detail: p.error };
              return st;
            });
          }

          // agent 的总结作为助手消息展示在对话里
          const messages =
            p.type === 'agent:summary' && p.message
              ? [
                  ...s.messages,
                  {
                    id: nextMessageId(),
                    role: 'assistant' as const,
                    content: p.message,
                    timestamp: p.timestamp,
                  },
                ]
              : s.messages;

          return { logs, stages, messages };
        }

        case 'project_created':
        case 'project_updated':
          return { projectId: event.projectId, versionNo: event.versionNo };

        case 'done': {
          const ok = event.finalState === 'done';
          return {
            state: ok ? 'done' : 'error',
            result: event.result,
            questions: event.questions,
            quality: event.quality,
            projectId: event.projectId ?? s.projectId,
            error: ok ? null : (event.reason ?? '生成失败'),
            stages: s.stages.map((st) =>
              st.status === 'active'
                ? { ...st, status: ok ? ('done' as const) : ('failed' as const) }
                : st,
            ),
            messages: [
              ...s.messages,
              {
                id: nextMessageId(),
                role: 'assistant' as const,
                content: ok
                  ? event.result?.notes || '生成完成'
                  : `生成失败：${event.reason ?? '未知原因'}`,
                timestamp: Date.now(),
              },
            ],
          };
        }

        case 'error':
          return {
            state: 'error',
            error: event.message,
            messages: [
              ...s.messages,
              {
                id: nextMessageId(),
                role: 'system' as const,
                content: `错误：${event.message}`,
                timestamp: Date.now(),
              },
            ],
          };

        case 'persist_error':
          return {
            messages: [
              ...s.messages,
              {
                id: nextMessageId(),
                role: 'system' as const,
                content: `结果保存失败：${event.message}`,
                timestamp: Date.now(),
              },
            ],
          };

        case 'aborted':
          return {
            state: 'idle',
            messages: [
              ...s.messages,
              {
                id: nextMessageId(),
                role: 'system' as const,
                content: event.message || '已停止',
                timestamp: Date.now(),
              },
            ],
          };

        case 'heartbeat':
          return s; // 心跳仅用于喂看门狗，不产生状态变更
      }
    }),

  setError: (message) =>
    set((s) => ({
      state: 'error',
      error: message,
      messages: [
        ...s.messages,
        {
          id: nextMessageId(),
          role: 'system',
          content: `错误：${message}`,
          timestamp: Date.now(),
        },
      ],
    })),

  setIdle: () => set({ state: 'idle' }),
  setStopping: () => set({ state: 'stopping' }),

  reset: () => set({ ...initialRunState, messages: [] }),
}));
