// 与后端 API 对齐的 DTO 类型，严格 snake_case

export interface User {
  id: string;
  email: string;
  role: 'free' | 'paid';
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  // 草稿项目状态：summarizing = 标题生成中（乐观 UI 转圈），ready = 正常。
  // 可选：未部署 draft 接口的旧后端不返回该字段，视为 ready
  status?: 'summarizing' | 'ready';
  input_preview?: string;
  pinned: boolean;
  created_at: string; // ISO8601
}

export interface VersionFile {
  path: string;
  content: string;
}

export interface Version {
  id: string;
  project_id: string;
  files: VersionFile[];
  version_no: number;
  is_snapshot: boolean;
  snapshot_name: string | null;
  created_at: string;
  // process_data 展开字段
  request: string;
  notes: string;
  spec: SpecOutput | null;
  sop_id: string;
  stages: StageState[];
  logs: ProcessLog[];
  parent_version_no: number | null;
  questions: string[] | null;
  stage_outputs: Record<string, unknown> | null;
}

export interface StageState {
  stage: string;
  status: 'pending' | 'active' | 'done' | 'failed';
  detail?: string;
}

export interface ProcessLog {
  seq: number;
  stage: string;
  phase: 'start' | 'end' | 'progress';
  detail?: string;
  timestamp: number;
}

export interface SpecOutput {
  requirements: string[];
  constraints: string[];
  user_stories: string[];
  architecture?: {
    type: string;
    ui?: string;
    state?: string;
    interactions?: string;
  };
}

export interface ApiError {
  error: string;
  message: string;
  [key: string]: unknown;
}

export interface AuthResponse {
  token: string;
  user: User;
}

/** 会话消息（GET /api/projects/:id 随详情下发，按 created_at 正序） */
export interface ProjectMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ProjectWithVersions {
  project: Project;
  versions: Version[];
  // 可选：未部署 messages 字段的旧后端不返回，前端按空历史处理
  messages?: ProjectMessage[];
}
