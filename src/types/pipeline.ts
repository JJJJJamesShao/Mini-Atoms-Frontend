import type { VersionFile } from './api';

// Pipeline 请求体与 SSE 事件沿用后端 camelCase 协议
// （后端 zod schema 严格校验 camelCase，snake_case 字段会被静默丢弃）
export interface PipelineRequest {
  input: string;
  projectId?: string;
  currentFiles?: VersionFile[];
  baseVersionNo?: number;
}

// SSE 事件联合类型
export type SseEvent =
  | { type: 'start'; input: string; sop: { id: string; name: string; steps: string[] } }
  | { type: 'agent_event'; payload: AgentEvent }
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'project_created'; projectId: string; versionNo: number }
  | { type: 'project_updated'; projectId: string; versionNo: number }
  | {
      type: 'done';
      finalState: 'done' | 'fail';
      reason: string | null;
      questions: string[] | null;
      projectId: string | null;
      result: { files: VersionFile[]; notes: string } | null;
      // 仅 finalState === 'done' 且有结果时下发，否则为 null
      quality: {
        passed: boolean;
        score: number;
        checks: { name: string; passed: boolean }[];
      } | null;
    }
  | { type: 'error'; message: string }
  | { type: 'aborted'; message: string }
  | { type: 'persist_error'; message: string };

export interface AgentEvent {
  type:
    | 'agent:start'
    | 'agent:thinking'
    | 'agent:progress'
    | 'agent:summary'
    | 'agent:complete'
    | 'agent:error'
    | 'file:generated';
  agent: string;
  role: string;
  message?: string;
  percent?: number;
  output?: unknown;
  error?: string;
  timestamp: number;
}

export type PipelineState = 'idle' | 'running' | 'stopping' | 'done' | 'error';
