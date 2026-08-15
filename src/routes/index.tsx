import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles } from 'lucide-react';
import PipelineChat from '@/components/PipelineChat';
import { usePipelineStore } from '@/stores/pipelineStore';

// 首页：空状态 + 新建引导，直接输入需求即可创建第一个项目
export default function HomePage() {
  const navigate = useNavigate();
  const projectId = usePipelineStore((s) => s.projectId);

  // 收到 project_created 后自动跳转到新项目工作区
  useEffect(() => {
    if (projectId) navigate(`/project/${projectId}`);
  }, [projectId, navigate]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <Sparkles className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-2xl font-bold">用一句话生成你的应用</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          在下方描述你想要的应用，Mini Atoms 会自动完成设计、开发与质量检查，
          生成的项目会出现在左侧列表中。
        </p>
      </div>
      <div className="mx-auto w-full max-w-2xl pb-6">
        <div className="h-64 rounded-lg border border-border bg-card">
          <PipelineChat />
        </div>
      </div>
    </div>
  );
}
