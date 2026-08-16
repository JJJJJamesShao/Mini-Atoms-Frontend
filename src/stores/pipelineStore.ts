import { create } from 'zustand';
import type { ProcessLog, StageState, VersionFile } from '@/types/api';
import type {
  PipelineState,
  SseEvent,
  UserFriendlySpec,
} from '@/types/pipeline';

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
  /** 生成模式：mock = 罐头数据（启发式判定），live = 真实 LLM；未运行为 null */
  mode: 'mock' | 'live' | null;
  /** 本次运行开始时间（用于 mock 启发式的耗时判定） */
  runStartedAt: number | null;
  /** 确认门挂起中的规格（spec_ready）；非 null 时展示确认面板 */
  pendingSpec: UserFriendlySpec | null;

  /** 开始一次运行：重置运行态并记录用户输入 */
  beginRun: (input: string) => void;
  /** 首次生成：草稿项目创建成功后记录 projectId（驱动首页跳转工作区） */
  setDraftProject: (projectId: string) => void;
  /** 用户落锤/超时/异常后收起规格确认面板 */
  clearPendingSpec: () => void;
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
  mode: null as 'mock' | 'live' | null,
  runStartedAt: null as number | null,
  pendingSpec: null as UserFriendlySpec | null,
};

export const usePipelineStore = create<PipelineStore>((set) => ({
  ...initialRunState,
  messages: [],

  beginRun: (input) =>
    set((s) => ({
      ...initialRunState,
      state: 'running',
      currentInput: input,
      runStartedAt: Date.now(),
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

  setDraftProject: (projectId) => set({ projectId }),

  clearPendingSpec: () => set({ pendingSpec: null }),

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

        case 'spec_ready':
          // 确认门挂起：展示确认面板（auto-approve/MOCK 不会收到本事件）
          return { pendingSpec: event.spec };

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
          // Mock 启发式判定：罐头执行器毫秒级返回（真实 LLM 生成远超 2s），
          // 且 notes 为固定罐头文案（特征串与后端 lib/mock/canned.ts 对齐）
          const CANNED_NOTES_SIGNATURES = [
            '无持久化（刷新清空）',
            '15x15 网格',
            'rAF 驱动显示',
          ];
          const durationMs = s.runStartedAt
            ? Date.now() - s.runStartedAt
            : null;
          const looksCanned =
            !!event.result?.notes &&
            CANNED_NOTES_SIGNATURES.some((sig) =>
              event.result!.notes.includes(sig),
            );
          const mode =
            looksCanned || (durationMs !== null && durationMs < 2000)
              ? ('mock' as const)
              : ('live' as const);
          return {
            state: ok ? 'done' : 'error',
            mode,
            pendingSpec: null,
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
            pendingSpec: null,
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
            pendingSpec: null,
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
      pendingSpec: null,
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

  setIdle: () => set({ state: 'idle', pendingSpec: null }),
  setStopping: () => set({ state: 'stopping' }),

  reset: () => set({ ...initialRunState, messages: [] }),
}));
