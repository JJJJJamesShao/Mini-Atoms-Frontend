import type { VersionFile } from './api';

export interface PipelineRequest {
  input: string;
  project_id?: string;
  current_files?: VersionFile[];
  base_version_no?: number; // 后端兼容 baseVersionNo，类型声明用 snake_case
}

// SSE 事件联合类型
export type SseEvent =
  | { type: 'start'; input: string; sop: { id: string; name: string; steps: string[] } }
  | { type: 'agent_event'; payload: AgentEvent }
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'project_created'; project_id: string; version_no: number }
  | { type: 'project_updated'; project_id: string; version_no: number }
  | {
      type: 'done';
      final_state: 'done' | 'fail';
      reason: string | null;
      questions: string[] | null;
      project_id: string | null;
      result: { files: VersionFile[]; notes: string } | null;
      quality: {
        passed: boolean;
        score: number;
        checks: { name: string; passed: boolean }[];
      };
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
