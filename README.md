# Mini Atoms Frontend

Mini Atoms 的前端：用自然语言描述需求，通过 Pipeline（SSE 实时流）自动生成 Web 应用并预览。对接 Mini-Atoms-Backend（Fastify + PostgreSQL）。

## 技术栈

- React 19 + TypeScript + Vite
- React Router 7（data API，`createBrowserRouter`）
- Tailwind CSS 4（`@tailwindcss/vite`，暗色主题）
- Zustand（客户端状态）+ TanStack Query v5（服务端状态）
- Radix UI + 手写 shadcn 风格基础组件（`src/components/ui/`）
- 原生 fetch + 手写 SSE 流解析（`src/lib/sse.ts`）

## 开发

```bash
npm install        # 首次安装（prepare 脚本会自动配置 .githooks）
npm run dev        # 开发服务器 http://localhost:5173（/api 代理到 localhost:3000）
npm run build      # 类型检查 + 生产构建
```

## 环境变量

见 `.env.example`：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_URL` | 后端 API 地址；留空则走 Vite dev proxy | `http://localhost:3000` |

## 目录结构

```
src/
├── routes/        # 页面（__root 布局 / index / login / register / project.$id）
├── components/    # 业务组件 + ui/ 基础组件
├── hooks/         # useAuth / usePipeline(SSE 核心) / useProjects / useApi
├── stores/        # authStore / pipelineStore（Zustand）
├── lib/           # api(fetch 封装) / sse(SSE 解析器) / utils(cn)
├── types/         # 与后端对齐的 DTO 类型（snake_case）
└── config.ts      # 环境变量与常量
```

## 分支工作流

- 所有开发在 `feat/` 分支上进行，通过 PR 合入 `main`（仓库内 `.githooks/` 强制：禁止在 main 提交/推送、只允许推送 `feat/` 分支）。
- 新分支基于最新 `main` 创建：`git pull origin main && git checkout -b feat/<名称>`。
- 提交前跑 L1 本地验证（build + dev 冒烟）；功能点完成后跑 L2 快速评审（`docs/review/quick-task.md`）。
