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

export interface ProjectWithVersions {
  project: Project;
  versions: Version[];
}
